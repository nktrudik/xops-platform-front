"""Передача запроса и приём OpenAI-совместимого ответа через HTTP-прокси платформы."""

import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings
from tests.test_catalog import MutableSource, deployment


def completion(content: str = "Ответ копилота") -> dict[str, object]:
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1,
        "model": "test",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
    }


def test_backend_sends_openai_contract_and_returns_reply() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=completion())

    messages = [
        {"role": "user", "content": "Первый вопрос"},
        {"role": "assistant", "content": "Первый ответ"},
        {"role": "user", "content": "Уточнение"},
    ]
    with TestClient(
        create_app(source=MutableSource([deployment()]), transport=httpx.MockTransport(handler))
    ) as client:
        response = client.post("/api/copilots/test/chat", json={"messages": messages})
        assert response.status_code == 200
        assert response.json() == {"reply": "Ответ копилота"}
        assert response.headers["cache-control"] == "no-store"
    assert len(requests) == 1
    assert requests[0].method == "POST"
    assert str(requests[0].url) == "https://example.test/service/api/v1/chat/completions"
    assert json.loads(requests[0].content) == {
        "model": "test",
        "messages": messages,
        "stream": False,
    }


@pytest.mark.parametrize("status", [404, 405, 500, 302, 401, 429])
def test_upstream_http_errors_are_not_demo_answers(status: int) -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(status, headers={"Location": "https://other.test"})
    )
    with TestClient(
        create_app(source=MutableSource([deployment()]), transport=transport)
    ) as client:
        response = client.post(
            "/api/copilots/test/chat", json={"messages": [{"role": "user", "content": "Вопрос"}]}
        )
        assert response.status_code == 502
        assert "reply" not in response.json()


@pytest.mark.parametrize("body", [{}, {"choices": []}, completion(""), completion("   ")])
def test_invalid_completion_is_rejected(body: dict[str, object]) -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=body))
    with TestClient(
        create_app(source=MutableSource([deployment()]), transport=transport)
    ) as client:
        assert (
            client.post(
                "/api/copilots/test/chat",
                json={"messages": [{"role": "user", "content": "Вопрос"}]},
            ).status_code
            == 502
        )


@pytest.mark.parametrize(
    "messages",
    [
        [],
        [{"role": "system", "content": "Инструкция"}],
        [{"role": "user", "content": ""}],
        [{"role": "user", "content": "x" * 4001}],
        [{"role": "assistant", "content": "Ответ"}],
    ],
)
def test_bad_request_does_not_contact_copilot(messages: list[dict[str, str]]) -> None:
    with TestClient(create_app(source=MutableSource([]))) as client:
        assert (
            client.post("/api/copilots/test/chat", json={"messages": messages}).status_code == 422
        )


@pytest.mark.parametrize(
    ("entry", "id", "status"),
    [
        (deployment(), "unknown", 404),
        (deployment(interface={"type": "embedded"}), "test", 409),
        ({**deployment(), "status": "unavailable"}, "test", 503),
        ({**deployment(), "base_url": None}, "test", 409),
    ],
)
def test_route_requires_registered_available_chat(
    entry: dict[str, object], id: str, status: int
) -> None:
    with TestClient(create_app(source=MutableSource([entry]))) as client:
        assert (
            client.post(
                f"/api/copilots/{id}/chat",
                json={"messages": [{"role": "user", "content": "Вопрос"}]},
            ).status_code
            == status
        )


def test_timeout_is_recoverable() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        await asyncio.sleep(0.1)
        return httpx.Response(200, json=completion())

    with TestClient(
        create_app(
            Settings(chat_timeout=0.01),
            source=MutableSource([deployment()]),
            transport=httpx.MockTransport(handler),
        )
    ) as client:
        assert (
            client.post(
                "/api/copilots/test/chat",
                json={"messages": [{"role": "user", "content": "Вопрос"}]},
            ).status_code
            == 504
        )
