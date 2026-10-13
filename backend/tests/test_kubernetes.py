"""Проверки реального адаптера Kubernetes с подменой границы SDK."""

import asyncio
import json
from dataclasses import dataclass

import pytest
from kubernetes.client.rest import ApiException

from app.discovery import DiscoveryError, to_copilot
from app.kubernetes import KubernetesCopilotSource


@dataclass
class Response:
    payload: dict[str, object]

    def to_dict(self) -> dict[str, object]:
        return self.payload


class Core:
    def __init__(self, namespaces: list[str], metadata: str | None) -> None:
        self.namespaces = namespaces
        self.metadata = metadata
        self.failure = False

    def list_config_map_for_all_namespaces(
        self, *, field_selector: str, _request_timeout: float
    ) -> Response:
        assert field_selector == "metadata.name=copilot-meta"
        assert _request_timeout == 8
        if self.failure:
            raise ApiException(status=403)
        return Response(
            {
                "items": [
                    {
                        "metadata": {"namespace": ns},
                        "data": {"metadata.json": self.metadata} if self.metadata else {},
                    }
                    for ns in self.namespaces
                ]
            }
        )


class Apps:
    def __init__(self, ready: set[str]) -> None:
        self.ready = ready
        self.failure = False

    def list_deployment_for_all_namespaces(self, *, _request_timeout: float) -> Response:
        assert _request_timeout == 8
        if self.failure:
            raise ApiException(status=503)
        return Response(
            {
                "items": [
                    {"metadata": {"namespace": ns}, "status": {"available_replicas": 1}}
                    for ns in self.ready
                ]
            }
        )


def test_real_discovery_filters_environment_and_tracks_changes() -> None:
    metadata = json.dumps(
        {"display_name": "Сервис", "description": "Описание", "interface": {"type": "chat"}}
    )
    core = Core(["first-dev", "second-dev", "other-prod", "platform-xops-dev"], metadata)
    apps = Apps({"first-dev"})
    source = KubernetesCopilotSource("dev", "node.test", "platform-xops-dev", core=core, apps=apps)
    items = asyncio.run(source.list_deployments())
    assert [item.copilot_name for item in items] == ["first", "second"]
    assert items[0].base_url == "http://node.test/dev/first"
    assert items[0].status == "available"
    assert items[1].status == "unavailable"
    core.namespaces = ["third-dev"]
    apps.ready = {"third-dev"}
    assert asyncio.run(source.list_deployments())[0].copilot_name == "third"
    core.namespaces = []
    assert asyncio.run(source.list_deployments()) == []


@pytest.mark.parametrize("metadata", [None, "invalid", "[]", "{}"])
def test_missing_metadata_is_not_an_embedded_default(metadata: str | None) -> None:
    source = KubernetesCopilotSource(
        "dev",
        "node.test",
        "platform-dev",
        core=Core(["broken-dev"], metadata),
        apps=Apps({"broken-dev"}),
    )
    item = to_copilot(asyncio.run(source.list_deployments())[0])
    assert item.status == "configuration-error"
    assert item.interface is None


@pytest.mark.parametrize("target", ["core", "apps"])
def test_api_failures_are_not_reported_as_empty_catalog(target: str) -> None:
    core, apps = Core([], None), Apps(set())
    if target == "core":
        core.failure = True
    else:
        apps.failure = True
    source = KubernetesCopilotSource("dev", "node.test", "platform-dev", core=core, apps=apps)
    with pytest.raises(DiscoveryError):
        asyncio.run(source.list_deployments())
