"""Вход одного администратора, серверные сессии и защита изменяющих запросов."""

import asyncio
import hashlib
import hmac
import secrets
from datetime import datetime
from getpass import getpass
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from psycopg.rows import class_row
from pydantic import BaseModel, Field, SecretStr

from app.database import Database, get_database
from app.settings import Settings

COOKIE = "xops_session"


class User(BaseModel):
    """Текущий пользователь; роль пока всегда admin."""

    id: int
    username: str
    role: Literal["admin"] = "admin"


class Session(User):
    csrf_token: str


class Account(User):
    password_hash: SecretStr
    failed_attempts: int
    locked_until: datetime | None


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: SecretStr = Field(min_length=1, max_length=1024)


def hash_password(password: str, salt: str | None = None) -> str:
    """Создаёт scrypt-хеш со случайной солью; пароль нигде не записывается."""
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=2**17, r=8, p=1, maxmem=256 * 1024**2
    )
    return f"scrypt${salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt, _ = encoded.split("$")
        return algorithm == "scrypt" and hmac.compare_digest(hash_password(password, salt), encoded)
    except ValueError:
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def check_origin(request: Request) -> None:
    """Браузерные запросы с другого origin не могут изменять сессию."""
    from urllib.parse import urlsplit

    origin = request.headers.get("origin")
    if origin and urlsplit(origin).netloc != request.headers.get("host"):
        raise HTTPException(status_code=403, detail="Запрос с другого сайта запрещён")


async def require_user(request: Request) -> Session:
    """Проверяет серверную сессию для каждого API-запроса, включая прямой HTTP."""
    token = request.cookies.get(COOKIE)
    if not token or len(token) > 128:
        raise HTTPException(status_code=401, detail="Требуется вход")
    async with get_database(request).pool.connection() as connection:
        async with connection.cursor(row_factory=class_row(Session)) as cursor:
            await cursor.execute(
                "SELECT u.id, u.username, u.role, s.csrf_token FROM sessions s "
                "JOIN users u ON u.id = s.user_id WHERE s.token_hash = %s AND s.expires_at > now()",
                (token_hash(token),),
            )
            session = await cursor.fetchone()
    if session is None:
        raise HTTPException(status_code=401, detail="Сессия истекла. Войдите снова")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_origin(request)
        if not hmac.compare_digest(request.headers.get("x-xops-csrf", ""), session.csrf_token):
            raise HTTPException(status_code=403, detail="Обновите страницу и повторите запрос")
    return session


CurrentUser = Annotated[Session, Depends(require_user)]


def auth_router(database: Database, config: Settings) -> APIRouter:
    """Маршруты входа, проверки сессии и выхода."""
    router = APIRouter(prefix="/api/auth")
    password_lock = asyncio.Semaphore(1)
    cookie_path = config.base_path.rstrip("/") + "/"

    @router.post("/login", response_model=Session)
    async def login(body: Login, request: Request, response: Response) -> Session:
        check_origin(request)
        async with password_lock, database.pool.connection() as connection:
            async with (
                connection.transaction(),
                connection.cursor(row_factory=class_row(Account)) as cursor,
            ):
                await cursor.execute(
                    "SELECT id, username, role, password_hash, failed_attempts, locked_until "
                    "FROM users "
                    "WHERE username = 'admin' FOR UPDATE"
                )
                account = await cursor.fetchone()
                if account is None:
                    raise HTTPException(status_code=503, detail="Авторизация не настроена")
                if account.locked_until and account.locked_until > datetime.now(
                    account.locked_until.tzinfo
                ):
                    raise HTTPException(
                        status_code=429, detail="Слишком много попыток. Подождите минуту"
                    )
                valid = await asyncio.to_thread(
                    verify_password,
                    body.password.get_secret_value(),
                    account.password_hash.get_secret_value(),
                )
                if not valid or body.username != account.username:
                    await cursor.execute(
                        "UPDATE users SET failed_attempts = failed_attempts + 1, "
                        "locked_until = CASE WHEN failed_attempts >= 4 "
                        "THEN now() + interval '1 minute' "
                        "ELSE NULL END WHERE id = %s",
                        (account.id,),
                    )
                else:
                    await cursor.execute(
                        "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = %s",
                        (account.id,),
                    )
                    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
                    await cursor.execute("DELETE FROM sessions WHERE expires_at <= now()")
                    previous = request.cookies.get(COOKIE)
                    if previous:
                        await cursor.execute(
                            "DELETE FROM sessions WHERE token_hash = %s", (token_hash(previous),)
                        )
                    await cursor.execute(
                        "INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at) "
                        "VALUES (%s, %s, %s, now() + make_interval(hours => %s))",
                        (token_hash(token), account.id, csrf, config.session_hours),
                    )
            if not valid or body.username != account.username:
                raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        response.set_cookie(
            COOKIE,
            token,
            max_age=config.session_hours * 3600,
            path=cookie_path,
            httponly=True,
            secure=config.cookie_secure,
            samesite="strict",
        )
        return Session(id=account.id, username=account.username, csrf_token=csrf)

    @router.get("/me", response_model=Session)
    async def me(user: CurrentUser) -> Session:
        return user

    @router.post("/logout", status_code=204)
    async def logout(request: Request, response: Response, user: CurrentUser) -> None:
        async with database.pool.connection() as connection:
            await connection.execute(
                "DELETE FROM sessions WHERE token_hash = %s", (token_hash(request.cookies[COOKIE]),)
            )
        response.delete_cookie(
            COOKIE, path=cookie_path, httponly=True, secure=config.cookie_secure, samesite="strict"
        )

    return router


if __name__ == "__main__":
    password = getpass("Пароль администратора: ")
    if len(password) < 12 or password != getpass("Повторите пароль: "):
        raise SystemExit("Пароли должны совпадать и содержать не менее 12 символов")
    print(hash_password(password))
