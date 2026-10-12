"""Discovery копилотов из API кубера по ConfigMap `copilot-meta` (саморегистрация).

Копилот появляется на платформе, если в его неймспейсе есть ConfigMap `copilot-meta`
(ключ `metadata.json` с описанием). Это и фильтр «только настоящие копилоты», и источник
метаданных. Только чтение; в кластере — токен ServiceAccount (load_incluster_config).
"""

import asyncio
import json
from typing import Any

from kubernetes import client, config
from kubernetes.client.rest import ApiException
from pydantic import ValidationError

from app.models import Deployment

_ICONS = frozenset({"sparkles", "code", "layers", "document", "chart", "compass"})
_META_CONFIGMAP = "copilot-meta"
_META_KEY = "metadata.json"


class KubernetesCopilotSource:
    """Перечисляет копилотов текущего окружения по их `copilot-meta` (read-only)."""

    def __init__(
        self,
        environment: str,
        copilot_host: str,
        platform_namespace: str,
        *,
        core: Any | None = None,
        apps: Any | None = None,
    ) -> None:
        if core is None or apps is None:
            config.load_incluster_config()
            core = core or client.CoreV1Api()
            apps = apps or client.AppsV1Api()
        self._core = core
        self._apps = apps
        self._env = environment
        self._host = copilot_host
        self._platform_ns = platform_namespace

    async def list_deployments(self) -> list[Deployment]:
        """Синхронные вызовы клиента k8s выполняются в пуле потоков."""
        return await asyncio.to_thread(self._collect)

    def _collect(self) -> list[Deployment]:
        suffix = f"-{self._env}"
        result: list[Deployment] = []
        config_maps = self._core.list_config_map_for_all_namespaces(
            field_selector=f"metadata.name={_META_CONFIGMAP}"
        )
        for config_map in config_maps.items:
            namespace = str(config_map.metadata.namespace)
            if not namespace.endswith(suffix) or namespace == self._platform_ns:
                continue  # чужое окружение или сама платформа
            copilot_name = namespace[: -len(suffix)]
            if not copilot_name:
                continue
            deployment = self._build(namespace, copilot_name, config_map)
            if deployment is not None:
                result.append(deployment)
        return result

    def _build(self, namespace: str, copilot_name: str, config_map: Any) -> Deployment | None:
        meta = self._parse_metadata(config_map, copilot_name)
        icon = meta.pop("icon", "sparkles")
        payload: dict[str, Any] = {
            "copilot_name": copilot_name,
            "status": self._read_status(namespace),
            "base_url": f"http://{self._host}/{self._env}/{copilot_name}",
            "icon": icon if isinstance(icon, str) and icon in _ICONS else "sparkles",
            "metadata": meta,
        }
        try:
            return Deployment.model_validate(payload)
        except ValidationError:
            return None

    def _parse_metadata(self, config_map: Any, copilot_name: str) -> dict[str, Any]:
        """metadata.json из ConfigMap; битый/пустой → дефолты (embedded UI в корне)."""
        default: dict[str, Any] = {
            "display_name": copilot_name,
            "description": "Описание не настроено.",
            "interface": {"type": "embedded", "path": "/"},
        }
        raw = (config_map.data or {}).get(_META_KEY)
        if not raw:
            return default
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return default
        if not isinstance(parsed, dict):
            return default
        return {**default, **parsed}

    def _read_status(self, namespace: str) -> str:
        """available, если в неймспейсе есть хотя бы один готовый Deployment; иначе maintenance."""
        try:
            deployments = self._apps.list_namespaced_deployment(namespace).items
        except ApiException:
            return "maintenance"
        for deployment in deployments:
            available = getattr(deployment.status, "available_replicas", None)
            if available and int(available) > 0:
                return "available"
        return "maintenance"
