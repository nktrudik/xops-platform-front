"""HTTP-маршруты платформы и подключение discovery и интеграций."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import cast

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from psycopg import Error as PostgresError
from psycopg_pool import PoolClosed, PoolTimeout
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response as StarletteResponse

from app.auth import auth_router, require_user
from app.database import Database
from app.discovery import CopilotSource, DiscoveryError, get_catalog
from app.embedding import check_embedding, origin
from app.history import History, history_router
from app.kubernetes import KubernetesCopilotSource
from app.models import Copilot, EmbeddedInterface, EmbeddingResult
from app.settings import Settings


def _build_source(config: Settings) -> CopilotSource:
    """Использует только существующий discovery Kubernetes."""
    return KubernetesCopilotSource(
        config.environment,
        config.copilot_host,
        config.platform_namespace,
        copilot_base_domain=config.copilot_base_domain,
        copilot_scheme=config.copilot_scheme,
        timeout=config.integration_timeout,
    )


def create_app(
    settings: Settings | None = None,
    source: CopilotSource | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
    history: History | None = None,
) -> FastAPI:
    """Создаёт приложение с явно заменяемым discovery и HTTP-транспортом."""
    config = settings or Settings()
    discovery = source or _build_source(config)
    database = Database(config)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        try:
            if config.database_url.get_secret_value():
                await database.initialize(config.admin_password_hash.get_secret_value())
            # internal_gateway=https://traefik.kube-system: SNI не совпадает с wildcard-сертом,
            # трафик внутрикластерный и доверенный → verify off только для этого (копилотного) клиента.
            async with httpx.AsyncClient(
                timeout=config.integration_timeout,
                transport=transport,
                verify=not config.internal_gateway.startswith("https://"),
            ) as client:
                application.state.integration_client = client
                yield
        finally:
            await database.pool.close()

    application = FastAPI(
        title="XOps Platform DEV",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    application.state.database = database
    application.include_router(auth_router(database, config))
    application.include_router(
        history_router(
            history or History(database, discovery, config.chat_timeout, config.internal_gateway)
        )
    )

    @application.middleware("http")
    async def prevent_private_cache(
        request: Request, call_next: RequestResponseEndpoint
    ) -> StarletteResponse:
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    async def database_error(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=503, content={"detail": "База данных недоступна. Повторите запрос."}
        )

    for error_type in (PostgresError, PoolTimeout, PoolClosed):
        application.add_exception_handler(error_type, database_error)

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

    @application.get("/api/ready")
    async def ready() -> dict[str, str]:
        async with database.pool.connection() as connection:
            await connection.execute("SELECT 1")
        return {"status": "ok"}

    @application.get(
        "/api/copilots", response_model=list[Copilot], dependencies=[Depends(require_user)]
    )
    async def catalog(response: Response) -> list[Copilot]:
        response.headers["Cache-Control"] = "no-store"
        return await get_catalog(discovery)

    @application.get(
        "/api/copilots/{copilot_id}/embedding-check",
        response_model=EmbeddingResult,
        dependencies=[Depends(require_user)],
    )
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
            client,
            copilot.interface.url,
            origin(str(request.base_url)),
            config.integration_timeout,
            config.internal_gateway,
        )

    return application
