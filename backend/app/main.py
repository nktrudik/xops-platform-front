"""DEV API каталога и проверки встроенных приложений."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import cast

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from app.chat import ChatReply, ChatRequest, request_reply
from app.discovery import CopilotSource, DiscoveryError, get_catalog
from app.embedding import check_embedding, origin
from app.kubernetes import KubernetesCopilotSource
from app.models import Copilot, EmbeddedInterface, EmbeddingResult
from app.settings import Settings


def _build_source(config: Settings) -> CopilotSource:
    """Использует только существующий discovery Kubernetes."""
    return KubernetesCopilotSource(
        config.environment,
        config.copilot_host,
        config.platform_namespace,
        timeout=config.integration_timeout,
    )


def create_app(
    settings: Settings | None = None,
    source: CopilotSource | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    """Создаёт приложение с явно заменяемым discovery и HTTP-транспортом."""
    config = settings or Settings()
    discovery = source or _build_source(config)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient(
            timeout=config.integration_timeout,
            transport=transport,
        ) as client:
            application.state.integration_client = client
            yield

    application = FastAPI(
        title="XOps Platform DEV",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    @application.exception_handler(DiscoveryError)
    async def discovery_error(request: Request, error: DiscoveryError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": str(error)},
            headers={"Cache-Control": "no-store"},
        )

    @application.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "environment": config.environment}

    @application.get("/api/copilots", response_model=list[Copilot])
    async def catalog(response: Response) -> list[Copilot]:
        response.headers["Cache-Control"] = "no-store"
        return await get_catalog(discovery)

    @application.post("/api/copilots/{copilot_id}/chat", response_model=ChatReply)
    async def chat(
        copilot_id: str, body: ChatRequest, request: Request, response: Response
    ) -> ChatReply:
        response.headers["Cache-Control"] = "no-store"
        client = cast(httpx.AsyncClient, request.app.state.integration_client)
        return await request_reply(discovery, client, copilot_id, body, config.chat_timeout)

    @application.get("/api/copilots/{copilot_id}/embedding-check", response_model=EmbeddingResult)
    async def embedding(copilot_id: str, request: Request, response: Response) -> EmbeddingResult:
        response.headers["Cache-Control"] = "no-store"
        copilot = next(
            (item for item in await get_catalog(discovery) if item.id == copilot_id), None
        )
        if copilot is None:
            raise HTTPException(status_code=404, detail="Copilot не найден")
        if copilot.status != "available":
            return EmbeddingResult(state="unavailable", reason="Copilot сейчас недоступен.")
        if not isinstance(copilot.interface, EmbeddedInterface):
            raise HTTPException(status_code=409, detail="У Copilot нет встроенного интерфейса")
        client = cast(httpx.AsyncClient, request.app.state.integration_client)
        return await check_embedding(
            client, copilot.interface.url, origin(str(request.base_url)), config.integration_timeout
        )

    return application
