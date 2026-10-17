"""Подключение PostgreSQL и безопасная первоначальная инициализация схемы."""

from pathlib import Path
from typing import cast

from fastapi import Request
from psycopg_pool import AsyncConnectionPool

from app.settings import Settings


class Database:
    """Один пул подключений для авторизации и истории всех копилотов."""

    def __init__(self, config: Settings) -> None:
        self.pool = AsyncConnectionPool(
            config.database_url.get_secret_value(),
            open=False,
            min_size=1,
            max_size=8,
            timeout=5,
            kwargs={"autocommit": True, "connect_timeout": 5},
            check=AsyncConnectionPool.check_connection,
        )

    async def initialize(self, password_hash: str) -> None:
        """Создаёт отсутствующие таблицы и синхронизирует хеш администратора."""
        if not password_hash:
            raise ValueError("Не задан XOPS_ADMIN_PASSWORD_HASH")
        await self.pool.open(wait=True, timeout=10)
        async with self.pool.connection() as connection, connection.transaction():
            await connection.execute("SELECT pg_advisory_xact_lock(710804117)")
            await connection.execute(Path(__file__).with_name("schema.sql").read_text("utf-8"))
            # Смена пароля отзывает сессии; обычный рестарт их сохраняет.
            await connection.execute(
                "DELETE FROM sessions WHERE user_id IN "
                "(SELECT id FROM users WHERE username = 'admin' AND password_hash <> %s)",
                (password_hash,),
            )
            await connection.execute(
                "INSERT INTO users (username, password_hash) VALUES ('admin', %s) "
                "ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash",
                (password_hash,),
            )
            await connection.execute("DELETE FROM sessions WHERE expires_at <= now()")


def get_database(request: Request) -> Database:
    """Возвращает подключение приложения, не создавая глобального пула."""
    return cast(Database, request.app.state.database)
