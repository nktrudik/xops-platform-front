"""Каталог из существующих ConfigMap copilot-meta и готовности Deployment в Kubernetes."""

import asyncio
import json
import os
from typing import Protocol, cast

from kubernetes import client, config
from kubernetes.client.rest import ApiException
from kubernetes.config.config_exception import ConfigException
from pydantic import BaseModel, Field, ValidationError
from urllib3.exceptions import HTTPError

from app.discovery import DiscoveryError
from app.models import Deployment


class KubernetesResponse(Protocol):
    """Граница нетипизированного SDK; данные сразу проверяются моделями."""

    def to_dict(self) -> dict[str, object]: ...


class CoreClient(Protocol):
    """Используемая read-only операция CoreV1Api."""

    def list_config_map_for_all_namespaces(
        self, *, field_selector: str, _request_timeout: float
    ) -> KubernetesResponse: ...


class AppsClient(Protocol):
    """Используемая read-only операция AppsV1Api."""

    def list_deployment_for_all_namespaces(
        self, *, _request_timeout: float
    ) -> KubernetesResponse: ...


class ResourceMetadata(BaseModel):
    """Неймспейс объекта из ответа SDK."""

    namespace: str


class ConfigMapRecord(BaseModel):
    """Зарегистрированные метаданные копилота."""

    metadata: ResourceMetadata
    data: dict[str, str] | None = None


class ConfigMapList(BaseModel):
    """Проверенный ответ списка ConfigMap."""

    items: list[ConfigMapRecord]


class DeploymentStatus(BaseModel):
    """Количество готовых реплик из Kubernetes."""

    available_replicas: int | None = None


class DeploymentRecord(BaseModel):
    """Неймспейс и готовность обнаруженного Deployment."""

    metadata: ResourceMetadata
    status: DeploymentStatus | None = None


class DeploymentList(BaseModel):
    """Проверенный ответ списка Deployment."""

    items: list[DeploymentRecord] = Field(default_factory=list)


class KubernetesCopilotSource:
    """Читает реальные регистрации; отсутствующие метаданные не заменяет примерами."""

    def __init__(
        self,
        environment: str,
        copilot_host: str,
        platform_namespace: str,
        *,
        timeout: float = 8.0,
        core: CoreClient | None = None,
        apps: AppsClient | None = None,
    ) -> None:
        self._core = core
        self._apps = apps
        self._env = environment
        self._host = copilot_host
        self._platform_ns = platform_namespace
        self._timeout = timeout

    async def list_deployments(self) -> list[Deployment]:
        """Синхронный SDK работает вне event loop; ошибки источника возвращаются как 503."""
        try:
            return await asyncio.to_thread(self._collect)
        except (ApiException, ConfigException, HTTPError, OSError, ValueError) as error:
            raise DiscoveryError(
                "Не удалось получить каталог из Kubernetes. Проверьте ServiceAccount/RBAC "
                "или kubeconfig и доступность API кластера."
            ) from error

    def _collect(self) -> list[Deployment]:
        if self._core is None or self._apps is None:
            if os.environ.get("KUBERNETES_SERVICE_HOST"):
                config.load_incluster_config()
            else:
                config.load_kube_config(persist_config=False)
            self._core = cast(CoreClient, client.CoreV1Api())
            self._apps = cast(AppsClient, client.AppsV1Api())
        maps = ConfigMapList.model_validate(
            self._core.list_config_map_for_all_namespaces(
                field_selector="metadata.name=copilot-meta", _request_timeout=self._timeout
            ).to_dict()
        )
        deployments = DeploymentList.model_validate(
            self._apps.list_deployment_for_all_namespaces(_request_timeout=self._timeout).to_dict()
        )
        ready = {
            item.metadata.namespace
            for item in deployments.items
            if item.status is not None and (item.status.available_replicas or 0) > 0
        }
        suffix = f"-{self._env}"
        result: list[Deployment] = []
        for registration in maps.items:
            namespace = registration.metadata.namespace
            if not namespace.endswith(suffix) or namespace == self._platform_ns:
                continue
            name = namespace[: -len(suffix)]
            if not name:
                continue
            metadata = self._metadata(registration)
            icon = metadata.pop("icon", "sparkles")
            try:
                result.append(
                    Deployment.model_validate(
                        {
                            "copilot_name": name,
                            "status": "available" if namespace in ready else "unavailable",
                            "base_url": f"http://{self._host}/{self._env}/{name}"
                            if self._host
                            else None,
                            "icon": icon,
                            "metadata": metadata,
                        }
                    )
                )
            except ValidationError:
                raise DiscoveryError("Kubernetes вернул некорректную регистрацию Copilot") from None
        return sorted(result, key=lambda item: item.copilot_name)

    @staticmethod
    def _metadata(registration: ConfigMapRecord) -> dict[str, object]:
        raw = (registration.data or {}).get("metadata.json")
        if not raw:
            return {}
        try:
            parsed: object = json.loads(raw)
        except ValueError:
            return {}
        return cast(dict[str, object], parsed) if isinstance(parsed, dict) else {}
