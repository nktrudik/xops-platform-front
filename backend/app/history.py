"""Диалоги универсального чата: владение, постраничная история и повтор запросов."""

from datetime import datetime
from typing import Annotated, Literal, cast
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response
from psycopg import AsyncConnection
from psycopg.rows import class_row
from pydantic import BaseModel

from app.auth import CurrentUser
from app.chat import request_reply
from app.chat_models import ChatMessage, ChatReply, ChatRequest
from app.database import Database
from app.discovery import CopilotSource, get_catalog


class Conversation(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class Message(BaseModel):
    id: str
    request_id: UUID
    role: Literal["user", "assistant"]
    content: str
    status: Literal["pending", "failed", "complete"]
    error: str | None
    created_at: datetime


class MessagePage(BaseModel):
    messages: list[Message]
    next_before: str | None


class ConversationPage(BaseModel):
    conversations: list[Conversation]
    next_before: UUID | None


class History:
    """Хранит историю всех копилотов в общей БД; доступ всегда ограничен владельцем."""

    def __init__(self, database: Database, source: CopilotSource, timeout: float) -> None:
        self.database, self.source, self.timeout = database, source, timeout

    async def create(self, user_id: int, copilot_id: str) -> Conversation:
        copilot = next(
            (item for item in await get_catalog(self.source) if item.id == copilot_id), None
        )
        if copilot is None:
            raise HTTPException(status_code=404, detail="Copilot не найден")
        if copilot.interface is None or copilot.interface.type != "chat":
            raise HTTPException(
                status_code=409, detail="История доступна только для универсального чата"
            )
        async with self.database.pool.connection() as connection:
            async with connection.cursor(row_factory=class_row(Conversation)) as cursor:
                await cursor.execute(
                    "INSERT INTO conversations (id, user_id, copilot_id) VALUES (%s, %s, %s) "
                    "RETURNING id, title, created_at, updated_at",
                    (uuid4(), user_id, copilot_id),
                )
                result = await cursor.fetchone()
        if result is None:
            raise RuntimeError("Не удалось создать диалог")
        return result

    async def list_conversations(
        self, user_id: int, copilot_id: str, before: UUID | None
    ) -> ConversationPage:
        async with self.database.pool.connection() as connection:
            async with connection.cursor(row_factory=class_row(Conversation)) as cursor:
                await cursor.execute(
                    "SELECT id, title, created_at, updated_at FROM conversations "
                    "WHERE user_id = %s AND copilot_id = %s AND (%s::uuid IS NULL OR "
                    "(created_at, id) < (SELECT created_at, id FROM conversations "
                    "WHERE id = %s AND user_id = %s AND copilot_id = %s)) "
                    "ORDER BY created_at DESC, id DESC LIMIT 21",
                    (user_id, copilot_id, before, before, user_id, copilot_id),
                )
                rows = await cursor.fetchall()
        return ConversationPage(
            conversations=rows[:20], next_before=rows[19].id if len(rows) > 20 else None
        )

    async def _owned(
        self,
        connection: AsyncConnection[tuple[object, ...]],
        user_id: int,
        copilot_id: str,
        conversation_id: UUID,
    ) -> None:
        async with connection.cursor(row_factory=class_row(Conversation)) as cursor:
            await cursor.execute(
                "SELECT id, title, created_at, updated_at FROM conversations "
                "WHERE id = %s AND user_id = %s AND copilot_id = %s",
                (conversation_id, user_id, copilot_id),
            )
            if await cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Диалог не найден")

    async def messages(
        self, user_id: int, copilot_id: str, conversation_id: UUID, before: int | None
    ) -> MessagePage:
        async with self.database.pool.connection() as connection:
            await self._owned(connection, user_id, copilot_id, conversation_id)
            async with connection.cursor(row_factory=class_row(Message)) as cursor:
                await cursor.execute(
                    "SELECT id::text, request_id, role, content, status, error, created_at "
                    "FROM messages "
                    "WHERE conversation_id = %s AND (%s::bigint IS NULL OR id < %s) "
                    "ORDER BY messages.id DESC LIMIT 31",
                    (conversation_id, before, before),
                )
                rows = await cursor.fetchall()
        page = rows[:30]
        return MessagePage(
            messages=list(reversed(page)), next_before=page[-1].id if len(rows) > 30 else None
        )

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
        """Сохраняет вопрос до API-вызова; одинаковый ключ не создаёт повторных сообщений."""
        question = body.messages[-1].content
        key = int.from_bytes(conversation_id.bytes[:8], "big", signed=True)
        async with self.database.pool.connection() as connection:
            await self._owned(connection, user_id, copilot_id, conversation_id)
            lock = await connection.execute("SELECT pg_try_advisory_lock(%s)", (key,))
            acquired = await lock.fetchone()
            if not acquired or acquired[0] is not True:
                raise HTTPException(
                    status_code=409, detail="Ответ уже готовится. Повторите запрос позже"
                )
            try:
                return await self._send_locked(
                    connection,
                    copilot_id,
                    conversation_id,
                    request_id,
                    question,
                    body.messages[:-1] if seed else [],
                    client,
                )
            finally:
                await connection.execute("SELECT pg_advisory_unlock(%s)", (key,))

    async def _send_locked(
        self,
        connection: AsyncConnection[tuple[object, ...]],
        copilot_id: str,
        conversation_id: UUID,
        request_id: UUID,
        question: str,
        seed: list[ChatMessage],
        client: httpx.AsyncClient,
    ) -> ChatReply:
        async with connection.cursor(row_factory=class_row(Message)) as cursor:
            await cursor.execute(
                "SELECT id::text, request_id, role, content, status, error, created_at "
                "FROM messages "
                "WHERE conversation_id = %s AND request_id = %s ORDER BY messages.id",
                (conversation_id, request_id),
            )
            existing = await cursor.fetchall()
            if existing and existing[0].content != question:
                raise HTTPException(
                    status_code=409,
                    detail="Этот идентификатор уже использован для другого сообщения",
                )
            if len(existing) == 2:
                return ChatReply(reply=existing[1].content)
            await cursor.execute(
                "SELECT id::text, request_id, role, content, status, error, created_at "
                "FROM messages "
                "WHERE conversation_id = %s AND role = 'user' AND status <> 'complete' LIMIT 1",
                (conversation_id,),
            )
            unfinished = await cursor.fetchone()
            if unfinished and unfinished.request_id != request_id:
                raise HTTPException(status_code=409, detail="Сначала повторите последнее сообщение")
        async with connection.transaction():
            if not existing:
                for item in seed:
                    await connection.execute(
                        "INSERT INTO messages (conversation_id, request_id, role, content) "
                        "VALUES (%s, %s, %s, %s)",
                        (conversation_id, uuid4(), item.role, item.content),
                    )
                await connection.execute(
                    "INSERT INTO messages (conversation_id, request_id, role, content, status) "
                    "VALUES (%s, %s, 'user', %s, 'pending')",
                    (conversation_id, request_id, question),
                )
            else:
                await connection.execute(
                    "UPDATE messages SET status = 'pending', error = NULL "
                    "WHERE conversation_id = %s AND request_id = %s AND role = 'user'",
                    (conversation_id, request_id),
                )
            await connection.execute(
                "UPDATE conversations SET title = CASE WHEN title = 'Новый диалог' "
                "THEN %s ELSE title END, "
                "updated_at = now() WHERE id = %s",
                (question[:80], conversation_id),
            )
        async with connection.cursor(row_factory=class_row(ChatMessage)) as cursor:
            await cursor.execute(
                "SELECT role, content FROM messages WHERE conversation_id = %s "
                "ORDER BY id DESC LIMIT 100",
                (conversation_id,),
            )
            context = list(reversed(await cursor.fetchall()))
        try:
            reply = await request_reply(
                self.source, client, copilot_id, ChatRequest(messages=context), self.timeout
            )
        except HTTPException as error:
            await connection.execute(
                "UPDATE messages SET status = 'failed', error = %s WHERE conversation_id = %s "
                "AND request_id = %s AND role = 'user'",
                (str(error.detail), conversation_id, request_id),
            )
            raise
        async with connection.transaction():
            await connection.execute(
                "INSERT INTO messages (conversation_id, request_id, role, content) "
                "VALUES (%s, %s, 'assistant', %s) ON CONFLICT DO NOTHING",
                (conversation_id, request_id, reply.reply),
            )
            await connection.execute(
                "UPDATE messages SET status = 'complete', error = NULL "
                "WHERE conversation_id = %s AND request_id = %s AND role = 'user'",
                (conversation_id, request_id),
            )
            await connection.execute(
                "UPDATE conversations SET updated_at = now() WHERE id = %s", (conversation_id,)
            )
        return reply


def history_router(history: History) -> APIRouter:
    router = APIRouter(prefix="/api/copilots/{copilot_id}")

    @router.get("/conversations", response_model=ConversationPage)
    async def conversations(
        copilot_id: str, user: CurrentUser, before: UUID | None = None
    ) -> ConversationPage:
        return await history.list_conversations(user.id, copilot_id, before)

    @router.post("/conversations", response_model=Conversation, status_code=201)
    async def create(copilot_id: str, user: CurrentUser) -> Conversation:
        return await history.create(user.id, copilot_id)

    @router.get("/conversations/{conversation_id}/messages", response_model=MessagePage)
    async def messages(
        copilot_id: str,
        conversation_id: UUID,
        user: CurrentUser,
        before: int | None = Query(default=None, gt=0),
    ) -> MessagePage:
        return await history.messages(user.id, copilot_id, conversation_id, before)

    @router.post("/chat", response_model=ChatReply)
    async def chat(
        copilot_id: str,
        body: ChatRequest,
        request: Request,
        response: Response,
        user: CurrentUser,
        conversation_id: UUID | None = None,
        idempotency_key: Annotated[UUID | None, Header(alias="Idempotency-Key")] = None,
    ) -> ChatReply:
        fresh = conversation_id is None
        if conversation_id is None:
            conversation_id = (await history.create(user.id, copilot_id)).id
        response.headers["X-Conversation-ID"] = str(conversation_id)
        client = cast(httpx.AsyncClient, request.app.state.integration_client)
        return await history.send(
            user.id,
            copilot_id,
            conversation_id,
            idempotency_key or uuid4(),
            body,
            client,
            seed=fresh,
        )

    return router
