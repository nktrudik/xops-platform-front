"""Изоляция существующих тестов интеграций от авторизации и PostgreSQL."""

from datetime import UTC, datetime
from uuid import UUID

import httpx
from fastapi import FastAPI

from app.auth import Session, require_user
from app.chat import request_reply
from app.chat_models import ChatReply, ChatRequest
from app.database import Database
from app.discovery import CopilotSource
from app.history import Conversation, History
from app.main import create_app as platform_app
from app.settings import Settings


class GatewayHistory(History):
    """Проверяет старые HTTP-сценарии; хранение отдельно тестируется на PostgreSQL."""

    async def create(self, user_id: int, copilot_id: str) -> Conversation:
        now = datetime.now(UTC)
        return Conversation(id=UUID(int=1), title="Тест", created_at=now, updated_at=now)

    async def send(
        self,
        user_id: int,
        copilot_id: str,
        conversation_id: UUID,
        request_id: UUID,
        body: ChatRequest,
        client: httpx.AsyncClient,
        seed: bool = False,
    ) -> ChatReply:
        return await request_reply(self.source, client, copilot_id, body, self.timeout)


def create_app(
    settings: Settings | None = None,
    source: CopilotSource | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    config = settings or Settings()
    if source is None:
        raise ValueError("Тесту нужен явный источник каталога")
    application = platform_app(
        config,
        source,
        transport,
        history=GatewayHistory(Database(config), source, config.chat_timeout),
    )
    application.dependency_overrides[require_user] = lambda: Session(
        id=1, username="admin", csrf_token="test"
    )
    return application
