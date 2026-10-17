"""Критические сценарии авторизации и истории на настоящей PostgreSQL."""

import asyncio
import json
import os
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from typing import cast
from uuid import uuid4

import httpx
import psycopg
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo
from pydantic import SecretStr

from app.auth import COOKIE, hash_password
from app.main import create_app
from app.settings import Settings
from tests.test_catalog import MutableSource, deployment


class Client(TestClient):
    """Selector loop нужен psycopg для запуска проверок также на Windows."""

    def __init__(self, application: FastAPI) -> None:
        super().__init__(application, backend_options={"loop_factory": asyncio.SelectorEventLoop})


@pytest.fixture(scope="module")
def admin_hash() -> str:
    return hash_password("integration-test-password")


@pytest.fixture
def config(admin_hash: str) -> Iterator[Settings]:
    dsn = os.environ.get("XOPS_TEST_DATABASE_URL")
    if not dsn:
        pytest.skip("Для интеграционных проверок нужен XOPS_TEST_DATABASE_URL")
    schema = f"test_{uuid4().hex}"
    with psycopg.connect(dsn, autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            yield Settings(
                database_url=SecretStr(make_conninfo(dsn, options=f"-csearch_path={schema}")),
                admin_password_hash=SecretStr(admin_hash),
                cookie_secure=False,
            )
        finally:
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


def sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"username": "admin", "password": "integration-test-password"}
    )
    assert response.status_code == 200
    client.headers["X-XOps-CSRF"] = response.json()["csrf_token"]


def source() -> MutableSource:
    return MutableSource([deployment("first"), deployment("second")])


def send(
    client: TestClient, conversation: str, request_id: str, text: str = "Вопрос"
) -> httpx.Response:
    return cast(
        httpx.Response,
        client.post(
            f"/api/copilots/first/chat?conversation_id={conversation}",
            headers={"Idempotency-Key": request_id},
            json={"messages": [{"role": "user", "content": text}]},
        ),
    )


def test_login_logout_csrf_expiry_and_direct_api_protection(config: Settings) -> None:
    with Client(create_app(config, source=source())) as client:
        for path in [
            "/api/copilots",
            "/api/copilots/first/embedding-check",
            "/api/copilots/first/conversations",
        ]:
            assert client.get(path).status_code == 401
        assert (
            client.post(
                "/api/copilots/first/chat",
                json={"messages": [{"role": "user", "content": "Вопрос"}]},
            ).status_code
            == 401
        )
        assert (
            client.post(
                "/api/auth/login", json={"username": "admin", "password": "incorrect"}
            ).status_code
            == 401
        )
        sign_in(client)
        token = client.cookies[COOKIE]
        assert client.get("/api/auth/me").json()["role"] == "admin"
        assert client.get("/api/copilots").status_code == 200
        client.headers.pop("X-XOps-CSRF")
        assert client.post("/api/copilots/first/conversations").status_code == 403
        client.headers["X-XOps-CSRF"] = client.get("/api/auth/me").json()["csrf_token"]
        assert (
            client.post(
                "/api/copilots/first/conversations", headers={"Origin": "https://other.test"}
            ).status_code
            == 403
        )
        assert client.post("/api/auth/logout").status_code == 204
        client.cookies.set(COOKIE, token)
        assert client.get("/api/auth/me").status_code == 401
        client.cookies.clear()
        sign_in(client)
        with psycopg.connect(config.database_url.get_secret_value(), autocommit=True) as connection:
            connection.execute("UPDATE sessions SET expires_at = now() - interval '1 second'")
        assert client.get("/api/auth/me").status_code == 401


def test_history_restore_pagination_context_limit_and_ownership(config: Settings) -> None:
    forwarded: list[object] = []

    def handler(request: httpx.Request) -> httpx.Response:
        forwarded.append(json.loads(request.content))
        return httpx.Response(200, json={"reply": "Ответ"})

    with Client(create_app(config, source(), httpx.MockTransport(handler))) as client:
        sign_in(client)
        conversation = client.post("/api/copilots/first/conversations").json()["id"]
        assert send(client, conversation, str(uuid4())).status_code == 200
        with psycopg.connect(config.database_url.get_secret_value(), autocommit=True) as connection:
            for index in range(100):
                connection.execute(
                    "INSERT INTO messages (conversation_id, request_id, role, content) "
                    "VALUES (%s, %s, %s, %s)",
                    (
                        conversation,
                        uuid4(),
                        "user" if index % 2 == 0 else "assistant",
                        f"Контекст {index}",
                    ),
                )
            row = connection.execute(
                "INSERT INTO users (username, password_hash) VALUES ('other', 'unused') "
                "RETURNING id"
            ).fetchone()
            assert row is not None
            foreign = uuid4()
            connection.execute(
                "INSERT INTO conversations (id, user_id, copilot_id) VALUES (%s, %s, 'first')",
                (foreign, row[0]),
            )
        assert send(client, conversation, str(uuid4()), "Продолжение").status_code == 200
        context = forwarded[-1]
        assert isinstance(context, dict) and len(context["messages"]) == 100
        assert set(context) == {"messages"}
        page = client.get(f"/api/copilots/first/conversations/{conversation}/messages").json()
        assert len(page["messages"]) == 30 and page["next_before"] is not None
        previous = client.get(
            f"/api/copilots/first/conversations/{conversation}/messages?before={page['next_before']}"
        ).json()
        assert len(previous["messages"]) == 30
        assert {item["id"] for item in page["messages"]}.isdisjoint(
            item["id"] for item in previous["messages"]
        )
        assert (
            client.get(f"/api/copilots/second/conversations/{conversation}/messages").status_code
            == 404
        )
        assert (
            client.get(f"/api/copilots/first/conversations/{foreign}/messages").status_code == 404
        )
        assert client.get("/api/copilots/second/conversations").json()["conversations"] == []
        assert len(client.get("/api/copilots/first/conversations").json()["conversations"]) == 1
        cookie = client.cookies[COOKIE]
    with Client(create_app(config, source())) as restarted:
        restarted.cookies.set(COOKIE, cookie)
        assert restarted.get("/api/auth/me").status_code == 200
        restored = restarted.get(
            f"/api/copilots/first/conversations/{conversation}/messages"
        ).json()
        assert restored == page


def test_failed_copilot_retry_does_not_duplicate_messages(config: Settings) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return (
            httpx.Response(503)
            if calls == 1
            else httpx.Response(200, json={"reply": "Сохранённый ответ"})
        )

    with Client(create_app(config, source(), httpx.MockTransport(handler))) as client:
        sign_in(client)
        conversation = client.post("/api/copilots/first/conversations").json()["id"]
        key = str(uuid4())
        assert send(client, conversation, key).status_code == 502
        page = client.get(f"/api/copilots/first/conversations/{conversation}/messages").json()
        assert len(page["messages"]) == 1 and page["messages"][0]["status"] == "failed"
        assert send(client, conversation, str(uuid4()), "Другой вопрос").status_code == 409
        assert send(client, conversation, key).json() == {"reply": "Сохранённый ответ"}
        assert send(client, conversation, key).status_code == 200
        assert calls == 2
        assert send(client, conversation, key, "Подмена вопроса").status_code == 409
        assert (
            len(
                client.get(f"/api/copilots/first/conversations/{conversation}/messages").json()[
                    "messages"
                ]
            )
            == 2
        )


def test_concurrent_retry_has_one_copilot_call(config: Settings) -> None:
    entered, release = Event(), Event()
    calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        entered.set()
        await asyncio.to_thread(release.wait, 5)
        return httpx.Response(200, json={"reply": "Ответ"})

    with Client(create_app(config, source(), httpx.MockTransport(handler))) as client:
        sign_in(client)
        conversation = client.post("/api/copilots/first/conversations").json()["id"]
        key = str(uuid4())
        with ThreadPoolExecutor(max_workers=1) as executor:
            first = executor.submit(send, client, conversation, key)
            try:
                assert entered.wait(5)
                assert send(client, conversation, key).status_code == 409
            finally:
                release.set()
            assert first.result(timeout=5).status_code == 200
        assert send(client, conversation, key).status_code == 200
        assert calls == 1


def test_database_write_failure_retains_question_and_retry_is_safe(config: Settings) -> None:
    with Client(
        create_app(
            config,
            source(),
            httpx.MockTransport(lambda request: httpx.Response(200, json={"reply": "Ответ"})),
        )
    ) as client:
        sign_in(client)
        conversation = client.post("/api/copilots/first/conversations").json()["id"]
        key = str(uuid4())
        with psycopg.connect(config.database_url.get_secret_value(), autocommit=True) as connection:
            connection.execute(
                "CREATE FUNCTION reject_answer() RETURNS trigger LANGUAGE plpgsql AS $$ "
                "BEGIN IF NEW.role = 'assistant' THEN RAISE EXCEPTION 'write failure' "
                "USING ERRCODE = '08006'; END IF; RETURN NEW; END $$"
            )
            connection.execute(
                "CREATE TRIGGER reject_answer BEFORE INSERT ON messages "
                "FOR EACH ROW EXECUTE FUNCTION reject_answer()"
            )
            assert send(client, conversation, key).status_code == 503
            page = client.get(f"/api/copilots/first/conversations/{conversation}/messages").json()
            assert len(page["messages"]) == 1 and page["messages"][0]["content"] == "Вопрос"
            connection.execute("DROP TRIGGER reject_answer ON messages")
        assert send(client, conversation, key).status_code == 200
        assert (
            len(
                client.get(f"/api/copilots/first/conversations/{conversation}/messages").json()[
                    "messages"
                ]
            )
            == 2
        )
