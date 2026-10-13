"""Передача сообщений копилоту по текстовому контракту OpenAI Chat Completions."""

import asyncio
from typing import Literal, Self
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.discovery import CopilotSource, to_copilot
from app.models import validate_http_url


class ChatMessage(BaseModel):
    """Текстовое сообщение пользователя или предыдущий ответ копилота."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=64000)

    @model_validator(mode="after")
    def limit_user_message(self) -> Self:
        """Ответ копилота может быть длиннее вопроса и возвращаться в истории."""
        if self.role == "user" and len(self.content) > 4000:
            raise ValueError("Вопрос не должен превышать 4000 символов")
        return self


class ChatRequest(BaseModel):
    """История диалога от frontend; адрес и модель определяет backend."""

    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def last_message_is_user(self) -> Self:
        """Последнее сообщение должно содержать новый вопрос пользователя."""
        if self.messages[-1].role != "user":
            raise ValueError("Последнее сообщение должно иметь role=user")
        return self


class AssistantMessage(BaseModel):
    """Поддерживаемый текстовый ответ Chat Completions."""

    role: Literal["assistant"]
    content: str = Field(min_length=1, max_length=64000)


class CompletionChoice(BaseModel):
    """Один результат OpenAI-совместимого ответа."""

    index: int = Field(ge=0)
    message: AssistantMessage
    finish_reason: Literal["stop", "length", "content_filter"]


class ChatCompletion(BaseModel):
    """Проверенные обязательные поля непотокового Chat Completions."""

    id: str = Field(min_length=1)
    object: Literal["chat.completion"]
    created: int = Field(ge=0)
    model: str = Field(min_length=1)
    choices: list[CompletionChoice] = Field(min_length=1)


class ChatReply(BaseModel):
    """Текст ответа для универсального чата Vue."""

    reply: str


async def request_reply(
    source: CopilotSource,
    client: httpx.AsyncClient,
    copilot_id: str,
    request: ChatRequest,
    timeout: float,
) -> ChatReply:
    """Адрес берётся только из discovery; запрос пользователя не может подменить цель."""
    deployment = next(
        (item for item in await source.list_deployments() if item.copilot_name == copilot_id), None
    )
    if deployment is None:
        raise HTTPException(status_code=404, detail="Copilot не найден")
    copilot = to_copilot(deployment)
    if copilot.interface is None:
        raise HTTPException(status_code=409, detail="Интерфейс Copilot не настроен")
    if copilot.interface.type != "chat":
        raise HTTPException(status_code=409, detail="Copilot не поддерживает универсальный чат")
    if copilot.status != "available":
        raise HTTPException(status_code=503, detail="Copilot сейчас недоступен")
    base = validate_http_url(deployment.base_url or "")
    if urlsplit(base).query or urlsplit(base).fragment:
        raise HTTPException(status_code=409, detail="Некорректный адрес API Copilot")
    try:
        async with asyncio.timeout(timeout):
            response = await client.post(
                f"{base.rstrip('/')}/api/v1/chat/completions",
                json={
                    "model": copilot_id,
                    "messages": [message.model_dump() for message in request.messages],
                    "stream": False,
                },
                timeout=timeout,
                follow_redirects=False,
            )
            if response.status_code in {404, 405}:
                raise HTTPException(
                    status_code=502, detail="У Copilot отсутствует POST /v1/chat/completions"
                )
            if not response.is_success:
                raise HTTPException(
                    status_code=502, detail=f"API Copilot вернул HTTP {response.status_code}"
                )
            raw: object = response.json()
            completion = ChatCompletion.model_validate(raw)
            choice = next((item for item in completion.choices if item.index == 0), None)
            if choice is None or not choice.message.content.strip():
                raise ValueError("Пустой текстовый ответ")
            return ChatReply(reply=choice.message.content)
    except (httpx.TimeoutException, TimeoutError) as error:
        raise HTTPException(status_code=504, detail="Copilot не ответил вовремя.") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Не удалось связаться с API Copilot") from error
    except (ValidationError, ValueError) as error:
        raise HTTPException(
            status_code=502, detail="Copilot вернул некорректный ответ Chat Completions"
        ) from error
