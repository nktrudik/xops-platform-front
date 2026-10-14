"""Единый контракт чата для frontend, платформы и копилота."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ChatMessage(BaseModel):
    """Вопрос пользователя или предыдущий ответ копилота."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=64000)

    @model_validator(mode="after")
    def limit_user_message(self) -> Self:
        """Длинные ответы можно передавать в истории следующего вопроса."""
        if self.role == "user" and len(self.content) > 4000:
            raise ValueError("Вопрос не должен превышать 4000 символов")
        return self


class ChatRequest(BaseModel):
    """История диалога, заканчивающаяся вопросом пользователя."""

    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def last_message_is_user(self) -> Self:
        if self.messages[-1].role != "user":
            raise ValueError("Последнее сообщение должно иметь role=user")
        return self


class ChatReply(BaseModel):
    """Текстовый ответ копилота без дополнительных служебных полей."""

    reply: str = Field(min_length=1, max_length=64000)

    @field_validator("reply")
    @classmethod
    def reject_blank_reply(cls, value: str) -> str:
        """Отклоняет пустой ответ, сохраняя форматирование текста."""
        if not value.strip():
            raise ValueError("Ответ не должен быть пустым")
        return value
