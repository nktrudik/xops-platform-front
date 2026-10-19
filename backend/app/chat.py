"""Передача истории сообщений в API зарегистрированного копилота."""

import asyncio
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException

from app.chat_models import ChatReply, ChatRequest
from app.discovery import CopilotSource, to_copilot

CHAT_PATH = "/api/v1/chat/completions"


async def request_reply(
    source: CopilotSource,
    client: httpx.AsyncClient,
    copilot_id: str,
    request: ChatRequest,
    timeout: float,
    internal_gateway: str = "",
) -> ChatReply:
    """Проверяет регистрацию и вызывает только адрес из discovery."""
    deployment = next(
        (item for item in await source.list_deployments() if item.copilot_name == copilot_id), None
    )
    if deployment is None:
        raise HTTPException(status_code=404, detail="Copilot не найден")
    copilot = to_copilot(deployment)
    if copilot.interface is None or deployment.base_url is None:
        raise HTTPException(status_code=409, detail="Интерфейс Copilot не настроен")
    if copilot.interface.type != "chat":
        raise HTTPException(status_code=409, detail="Copilot не поддерживает универсальный чат")
    if copilot.status != "available":
        raise HTTPException(status_code=503, detail="Copilot сейчас недоступен")
    # Server-side: при заданном internal_gateway бьём в ClusterIP Traefik (без hairpin), маршрут — по Host-заголовку
    # публичного адреса копилота. Иначе — напрямую по публичному base_url (legacy / локальная разработка).
    if internal_gateway:
        target = f"{internal_gateway.rstrip('/')}{CHAT_PATH}"
        headers = {"Host": urlsplit(deployment.base_url).netloc}
    else:
        target = f"{deployment.base_url.rstrip('/')}{CHAT_PATH}"
        headers = {}
    try:
        async with asyncio.timeout(timeout):
            response = await client.post(
                target,
                json=request.model_dump(),
                timeout=timeout,
                follow_redirects=False,
                headers=headers,
            )
            if response.status_code in {404, 405}:
                raise HTTPException(
                    status_code=502, detail=f"У Copilot отсутствует POST {CHAT_PATH}"
                )
            if not response.is_success:
                raise HTTPException(
                    status_code=502, detail=f"API Copilot вернул HTTP {response.status_code}"
                )
            raw: object = response.json()
            return ChatReply.model_validate(raw)
    except (httpx.TimeoutException, TimeoutError) as error:
        raise HTTPException(status_code=504, detail="Copilot не ответил вовремя.") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Не удалось связаться с API Copilot") from error
    except ValueError as error:
        raise HTTPException(
            status_code=502, detail="Copilot вернул некорректный ответ чата"
        ) from error
