"""Проверки HTTP-каталога без зависимости от конкретного кластера."""

from typing import cast

import pytest
from fastapi.testclient import TestClient

from app.discovery import DiscoveryError
from app.models import Deployment
from tests.support import create_app


def deployment(name: str = "test", interface: object = None) -> dict[str, object]:
    """Регистрация исключительно для автоматических проверок."""
    return {
        "copilot_name": name,
        "status": "available",
        "base_url": "https://example.test/service",
        "metadata": {
            "display_name": name.title(),
            "description": "Тестовый сервис",
            "interface": interface if interface is not None else {"type": "chat"},
        },
    }


class MutableSource:
    """Управляемый источник только для тестов бизнес-логики."""

    def __init__(self, items: list[dict[str, object]]) -> None:
        self.items = items
        self.failure = False

    async def list_deployments(self) -> list[Deployment]:
        if self.failure:
            raise DiscoveryError("Kubernetes недоступен")
        return [Deployment.model_validate(item) for item in self.items]


def test_catalog_tracks_changes_and_empty_source() -> None:
    source = MutableSource([deployment("first")])
    with TestClient(create_app(source=source)) as client:
        response = client.get("/api/copilots")
        assert response.headers["cache-control"] == "no-store"
        assert [item["id"] for item in response.json()] == ["first"]
        source.items[0]["status"] = "unavailable"
        source.items.append(deployment("second"))
        items = client.get("/api/copilots").json()
        assert len(items) == 2 and items[0]["status"] == "unavailable"
        source.items.pop(0)
        assert [item["id"] for item in client.get("/api/copilots").json()] == ["second"]
        source.items.clear()
        assert client.get("/api/copilots").json() == []


def test_all_interfaces() -> None:
    source = MutableSource(
        [
            deployment("embedded", {"type": "embedded", "path": "/ui?theme=light#chat"}),
            deployment("chat"),
            deployment("external", {"type": "external", "url": "https://example.com"}),
        ]
    )
    with TestClient(create_app(source=source)) as client:
        items = client.get("/api/copilots").json()
        assert items[0]["interface"]["url"] == "https://example.test/service/ui?theme=light#chat"
        assert items[1]["interface"] == {"type": "chat"}
        assert items[2]["interface"] == {"type": "external", "url": "https://example.com"}
        assert client.get("/api/health").json()["status"] == "ok"
        assert client.get("/api/docs").status_code == 200


@pytest.mark.parametrize(
    "interface",
    [
        {},
        {"type": ""},
        {"type": "unknown"},
        {"type": 42},
        {"type": "external", "url": "javascript:alert(1)"},
        {"type": "external", "url": "https://user:password@example.com"},
        {"type": "embedded", "path": "//other.test"},
        {"type": "embedded", "path": "/%2e%2e/"},
    ],
)
def test_invalid_metadata_is_visible(interface: object) -> None:
    source = MutableSource([deployment("invalid", interface), deployment("valid")])
    with TestClient(create_app(source=source)) as client:
        items = client.get("/api/copilots").json()
        assert items[0]["status"] == "configuration-error"
        assert items[0]["interface"] is None
        assert items[1]["interface"]["type"] == "chat"


@pytest.mark.parametrize("field", ["display_name", "description", "interface"])
def test_missing_metadata_is_not_defaulted(field: str) -> None:
    entry = deployment()
    cast(dict[str, object], entry["metadata"]).pop(field)
    with TestClient(create_app(source=MutableSource([entry]))) as client:
        assert client.get("/api/copilots").json()[0]["status"] == "configuration-error"


def test_discovery_failure_never_returns_demo_catalog() -> None:
    source = MutableSource([])
    source.failure = True
    with TestClient(create_app(source=source)) as client:
        assert client.get("/api/copilots").status_code == 503
        source.failure = False
        assert client.get("/api/copilots").json() == []
