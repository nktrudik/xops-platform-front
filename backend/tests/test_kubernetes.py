"""Тесты discovery копилотов по ConfigMap copilot-meta (с фейковыми клиентами)."""

import asyncio
import json
from types import SimpleNamespace
from typing import Any

from app.kubernetes import KubernetesCopilotSource


def _config_map(namespace: str, data: dict[str, str] | None) -> SimpleNamespace:
    return SimpleNamespace(metadata=SimpleNamespace(namespace=namespace), data=data)


class _FakeCore:
    """CoreV1Api: отдаёт заранее заданный список copilot-meta ConfigMap'ов."""

    def __init__(self, config_maps: list[SimpleNamespace]) -> None:
        self._config_maps = config_maps

    def list_config_map_for_all_namespaces(self, field_selector: str) -> Any:
        return SimpleNamespace(items=self._config_maps)


class _FakeApps:
    """AppsV1Api: готовность Deployment по неймспейсу."""

    def __init__(self, ready: set[str]) -> None:
        self._ready = ready

    def list_namespaced_deployment(self, namespace: str) -> Any:
        replicas = 1 if namespace in self._ready else 0
        status = SimpleNamespace(available_replicas=replicas)
        return SimpleNamespace(items=[SimpleNamespace(status=status)])


def test_discovers_registered_copilots_of_current_env() -> None:
    sales_meta = json.dumps(
        {
            "display_name": "Sales",
            "description": "Продажи",
            "interface": {"type": "chat"},
            "icon": "chart",
        }
    )
    core = _FakeCore(
        [
            _config_map("test-agent-alpha-dev", None),  # без metadata.json → дефолты
            _config_map("sales-copilot-dev", {"metadata.json": sales_meta}),
            _config_map("foo-prod", None),  # другое окружение — пропустить
            _config_map("platform-xops-dev", None),  # сама платформа — пропустить
        ]
    )
    apps = _FakeApps(ready={"test-agent-alpha-dev"})
    source = KubernetesCopilotSource("dev", "10.0.0.1", "platform-xops-dev", core=core, apps=apps)

    result = asyncio.run(source.list_deployments())

    assert {item.copilot_name for item in result} == {"test-agent-alpha", "sales-copilot"}

    alpha = next(item for item in result if item.copilot_name == "test-agent-alpha")
    assert alpha.base_url == "http://10.0.0.1/dev/test-agent-alpha"
    assert alpha.status == "available"
    assert alpha.icon == "sparkles"
    assert alpha.metadata["interface"] == {"type": "embedded", "path": "/"}

    sales = next(item for item in result if item.copilot_name == "sales-copilot")
    assert sales.status == "maintenance"  # нет готовых реплик
    assert sales.icon == "chart"
    assert sales.metadata["display_name"] == "Sales"
    assert sales.metadata["interface"] == {"type": "chat"}


def test_ignores_namespaces_without_meta() -> None:
    """Без copilot-meta ConfigMap копилот не попадает в каталог (саморегистрация)."""
    core = _FakeCore([])  # никто не зарегистрировался
    apps = _FakeApps(ready=set())
    source = KubernetesCopilotSource("dev", "host", "platform-xops-dev", core=core, apps=apps)

    assert asyncio.run(source.list_deployments()) == []
