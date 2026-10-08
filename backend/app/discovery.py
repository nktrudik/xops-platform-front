"""Mock discovery и преобразование метаданных в контракт frontend."""

import asyncio
import json
from pathlib import Path
from typing import Protocol
from urllib.parse import urlsplit

from pydantic import TypeAdapter, ValidationError

from app.models import (
    ApiInterface,
    ChatInterface,
    ChatMetadata,
    Copilot,
    CopilotMetadata,
    Deployment,
    EmbeddedInterface,
    EmbeddedMetadata,
    ExternalInterface,
    validate_http_url,
)


class DiscoveryError(Exception):
    """Источник discovery недоступен или возвращает некорректные записи."""


class CopilotSource(Protocol):
    """Минимальная граница будущего Kubernetes-адаптера."""

    async def list_deployments(self) -> list[Deployment]:
        """Возвращает системные имена, статусы, адреса и метаданные приложений."""
        ...


class MockCopilotSource:
    """Перечитывает файл при каждом запросе, имитируя изменяемый discovery."""

    def __init__(self, path: Path) -> None:
        self.path = path

    async def list_deployments(self) -> list[Deployment]:
        """Изменения файла видны без перезапуска backend."""
        try:
            content = await asyncio.to_thread(self.path.read_text, encoding="utf-8")
            raw: object = json.loads(content)
            deployments = TypeAdapter(list[Deployment]).validate_python(raw)
            if len({deployment.copilot_name for deployment in deployments}) != len(deployments):
                raise DiscoveryError("Источник содержит повторяющиеся системные имена Copilot")
            return deployments
        except (OSError, ValueError) as error:
            raise DiscoveryError("Не удалось загрузить mock discovery") from error


def to_copilot(deployment: Deployment) -> Copilot:
    """Преобразует metadata без привязки к конкретному приложению."""
    try:
        metadata = CopilotMetadata.model_validate(deployment.metadata)
        interface: ApiInterface
        if isinstance(metadata.interface, EmbeddedMetadata):
            if not deployment.base_url:
                raise ValueError("Адрес сервиса не настроен")
            base_url = validate_http_url(deployment.base_url)
            if urlsplit(base_url).query or urlsplit(base_url).fragment:
                raise ValueError("Адрес сервиса не должен содержать параметры или якорь")
            interface = EmbeddedInterface(url=base_url.rstrip("/") + metadata.interface.path)
        elif isinstance(metadata.interface, ChatMetadata):
            interface = ChatInterface()
        else:
            interface = ExternalInterface(url=metadata.interface.url)
        return Copilot(
            id=deployment.copilot_name,
            display_name=metadata.display_name,
            description=metadata.description,
            status=deployment.status,
            icon=deployment.icon,
            interface=interface,
        )
    except (ValidationError, ValueError):
        name = deployment.metadata.get("display_name")
        description = deployment.metadata.get("description")
        return Copilot(
            id=deployment.copilot_name,
            display_name=name
            if isinstance(name, str) and name.strip()
            else deployment.copilot_name,
            description=description
            if isinstance(description, str) and description.strip()
            else "Описание не настроено.",
            status="configuration-error",
            icon=deployment.icon,
            interface=None,
            configuration_error="Некорректные метаданные или адрес UI. Проверьте copilot.yaml.",
        )


async def get_catalog(source: CopilotSource) -> list[Copilot]:
    """Единая бизнес-логика каталога для mock и будущего discovery."""
    return [to_copilot(deployment) for deployment in await source.list_deployments()]
