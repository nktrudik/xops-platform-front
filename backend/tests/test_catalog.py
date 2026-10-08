"""Контракт каталога, изменяемый discovery и изоляция ошибок метаданных."""

import json
from pathlib import Path
from typing import cast

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models import Deployment
from app.settings import Settings


def deployment(name: str = "test", interface: object = None) -> dict[str, object]:
    """Создаёт запись discovery, не дублируя системное имя в метаданных."""
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


def write_catalog(path: Path, items: list[dict[str, object]]) -> None:
    path.write_text(json.dumps(items), encoding="utf-8")


def test_catalog_tracks_additions_removals_and_status(tmp_path: Path) -> None:
    path = tmp_path / "copilots.json"
    first = deployment("first")
    write_catalog(path, [first])
    with TestClient(create_app(Settings(catalog_file=path))) as client:
        response = client.get("/api/copilots")
        assert response.headers["cache-control"] == "no-store"
        assert [item["id"] for item in response.json()] == ["first"]
        first["status"] = "unavailable"
        write_catalog(path, [first, deployment("second")])
        items = client.get("/api/copilots").json()
        assert len(items) == 2
        assert items[0]["status"] == "unavailable"
        write_catalog(path, [deployment("second")])
        assert [item["id"] for item in client.get("/api/copilots").json()] == ["second"]
        write_catalog(path, [])
        assert client.get("/api/copilots").json() == []


def test_all_interfaces_and_embedded_address(tmp_path: Path) -> None:
    path = tmp_path / "copilots.json"
    write_catalog(
        path,
        [
            deployment("embedded", {"type": "embedded", "path": "/ui?theme=light#chat"}),
            deployment("chat"),
            deployment("external", {"type": "external", "url": "https://example.com"}),
        ],
    )
    with TestClient(create_app(Settings(catalog_file=path))) as client:
        items = client.get("/api/copilots").json()
        assert items[0]["interface"] == {
            "type": "embedded",
            "url": "https://example.test/service/ui?theme=light#chat",
        }
        assert items[1]["interface"] == {"type": "chat"}
        assert items[2]["interface"] == {"type": "external", "url": "https://example.com"}


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
def test_invalid_metadata_remains_visible_as_configuration_error(
    tmp_path: Path, interface: object
) -> None:
    path = tmp_path / "copilots.json"
    write_catalog(path, [deployment("invalid", interface), deployment("valid")])
    with TestClient(create_app(Settings(catalog_file=path))) as client:
        response = client.get("/api/copilots")
        assert response.status_code == 200
        items = response.json()
        assert items[0]["status"] == "configuration-error"
        assert items[0]["interface"] is None
        assert items[0]["configuration_error"]
        assert items[1]["interface"]["type"] == "chat"


@pytest.mark.parametrize("field", ["display_name", "description", "interface"])
def test_missing_required_metadata(tmp_path: Path, field: str) -> None:
    path = tmp_path / "copilots.json"
    entry = deployment()
    cast(dict[str, object], entry["metadata"]).pop(field)
    write_catalog(path, [entry])
    with TestClient(create_app(Settings(catalog_file=path))) as client:
        assert client.get("/api/copilots").json()[0]["status"] == "configuration-error"


def test_discovery_failure_and_recovery(tmp_path: Path) -> None:
    path = tmp_path / "copilots.json"
    with TestClient(create_app(Settings(catalog_file=path))) as client:
        assert client.get("/api/copilots").status_code == 503
        path.write_text("invalid json", encoding="utf-8")
        assert client.get("/api/copilots").status_code == 503
        write_catalog(path, [deployment(), deployment()])
        assert client.get("/api/copilots").status_code == 503
        write_catalog(path, [deployment()])
        assert client.get("/api/copilots").status_code == 200


def test_source_can_be_replaced_without_catalog_changes() -> None:
    class AlternativeSource:
        async def list_deployments(self) -> list[Deployment]:
            return [Deployment.model_validate(deployment("alternative"))]

    with TestClient(create_app(source=AlternativeSource())) as client:
        assert client.get("/api/copilots").json()[0]["id"] == "alternative"


def test_default_demo_catalog() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/copilots")
        assert response.status_code == 200
        items = response.json()
        assert len(items) == 6
        assert items[0]["interface"]["url"] == "http://2.59.80.61/dev/test-agent-alpha/"
        assert {item["interface"]["type"] for item in items} == {"chat", "external", "embedded"}
        assert client.get("/api/health").json() == {"status": "ok", "environment": "dev"}
        assert client.get("/api/docs").status_code == 200


@pytest.mark.parametrize("field", ["display_name", "description"])
def test_empty_metadata_preserves_readable_card(tmp_path: Path, field: str) -> None:
    path = tmp_path / "copilots.json"
    entry = deployment()
    cast(dict[str, object], entry["metadata"])[field] = "   "
    write_catalog(path, [entry])
    with TestClient(create_app(Settings(catalog_file=path))) as client:
        item = client.get("/api/copilots").json()[0]
        assert item["status"] == "configuration-error"
        assert item["display_name"].strip()
        assert item["description"].strip()
