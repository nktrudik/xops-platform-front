"""HTTP-проверка UI, политики iframe, ошибки связи и повтор запроса."""

import asyncio
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.embedding import embedding_restriction
from app.main import create_app
from app.settings import Settings
from tests.test_catalog import deployment, write_catalog


@pytest.mark.parametrize(
    ("headers", "state"),
    [
        ({}, "ready"),
        ({"X-Frame-Options": "DENY"}, "blocked"),
        ({"X-Frame-Options": "SAMEORIGIN"}, "blocked"),
        ({"Content-Security-Policy": "frame-ancestors 'none'"}, "blocked"),
        ({"Content-Security-Policy": "frame-ancestors 'self'"}, "blocked"),
        ({"Content-Security-Policy": "frame-ancestors http://testserver"}, "ready"),
        ({"Content-Security-Policy": "frame-ancestors *", "X-Frame-Options": "DENY"}, "ready"),
        ({"Content-Security-Policy": "frame-ancestors https://elsewhere.test"}, "blocked"),
    ],
)
def test_policies(tmp_path: Path, headers: dict[str, str], state: str) -> None:
    path = tmp_path / "copilots.json"
    write_catalog(path, [deployment(interface={"type": "embedded", "path": "/"})])
    transport = httpx.MockTransport(lambda request: httpx.Response(200, headers=headers))
    with TestClient(create_app(Settings(catalog_file=path), transport=transport)) as client:
        result = client.get("/api/copilots/test/embedding-check")
        assert result.status_code == 200
        assert result.json()["state"] == state
        assert result.headers["cache-control"] == "no-store"


def test_connection_failure_http_error_and_retry(tmp_path: Path) -> None:
    path = tmp_path / "copilots.json"
    write_catalog(path, [deployment(interface={"type": "embedded", "path": "/"})])
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if len(requests) == 1:
            raise httpx.ConnectError("Недоступен", request=request)
        if len(requests) == 2:
            return httpx.Response(503)
        return httpx.Response(200)

    with TestClient(
        create_app(Settings(catalog_file=path), transport=httpx.MockTransport(handler))
    ) as client:
        assert client.get("/api/copilots/test/embedding-check").json()["state"] == "unavailable"
        assert "503" in client.get("/api/copilots/test/embedding-check").json()["reason"]
        assert client.get("/api/copilots/test/embedding-check").json()["state"] == "ready"
    assert len(requests) == 3
    assert all(request.headers["cache-control"] == "no-cache" for request in requests)


def test_unknown_nonembedded_and_unavailable_do_not_contact_remote(tmp_path: Path) -> None:
    path = tmp_path / "copilots.json"
    offline = deployment("offline", {"type": "embedded", "path": "/"})
    offline["status"] = "unavailable"
    write_catalog(path, [deployment("chat"), offline])
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200)

    with TestClient(
        create_app(Settings(catalog_file=path), transport=httpx.MockTransport(handler))
    ) as client:
        assert client.get("/api/copilots/unknown/embedding-check").status_code == 404
        assert client.get("/api/copilots/chat/embedding-check").status_code == 409
        assert client.get("/api/copilots/offline/embedding-check").json()["state"] == "unavailable"
    assert not requests


@pytest.mark.parametrize(
    ("source", "parent", "allowed"),
    [
        ("https://*.example.com", "https://portal.example.com", True),
        ("https://*.example.com", "https://example.com", False),
        ("http://localhost:*", "http://localhost:8080", True),
        ("localhost:8080", "http://localhost:8080", True),
        ("http://localhost:80", "http://localhost", True),
        ("http://localhost:8080", "http://localhost:8081", False),
    ],
)
def test_csp_ancestor_sources(source: str, parent: str, allowed: bool) -> None:
    result = embedding_restriction(
        httpx.Headers({"Content-Security-Policy": f"frame-ancestors {source}"}),
        "http://copilot.test/",
        parent,
    )
    assert (result is None) == allowed


def test_combined_csp_policies_must_all_allow_embedding() -> None:
    headers = httpx.Headers(
        {"Content-Security-Policy": "frame-ancestors *, frame-ancestors 'none'"}
    )
    assert embedding_restriction(headers, "https://copilot.test", "http://localhost")


@pytest.mark.parametrize(
    ("location", "state", "calls"),
    [
        ("/login", "blocked", 2),
        ("file:///etc/passwd", "blocked", 1),
        ("https://user:password@example.test/", "blocked", 1),
        ("https://example.test/loop", "unavailable", 6),
    ],
)
def test_redirect_policies(tmp_path: Path, location: str, state: str, calls: int) -> None:
    path = tmp_path / "copilots.json"
    write_catalog(path, [deployment(interface={"type": "embedded", "path": "/"})])
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/login":
            return httpx.Response(200, headers={"X-Frame-Options": "DENY"})
        return httpx.Response(302, headers={"Location": location})

    with TestClient(
        create_app(Settings(catalog_file=path), transport=httpx.MockTransport(handler))
    ) as client:
        assert client.get("/api/copilots/test/embedding-check").json()["state"] == state
    assert len(requests) == calls


def test_integration_timeout_is_recoverable(tmp_path: Path) -> None:
    path = tmp_path / "copilots.json"
    write_catalog(path, [deployment(interface={"type": "embedded", "path": "/"})])

    async def handler(request: httpx.Request) -> httpx.Response:
        await asyncio.sleep(0.1)
        return httpx.Response(200)

    with TestClient(
        create_app(
            Settings(catalog_file=path, integration_timeout=0.01),
            transport=httpx.MockTransport(handler),
        )
    ) as client:
        assert client.get("/api/copilots/test/embedding-check").json()["state"] == "unavailable"
