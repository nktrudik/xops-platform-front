"""Настройки discovery Kubernetes и интеграций для dev/prod."""

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Параметры интеграций, задаваемые переменными окружения."""

    model_config = SettingsConfigDict(env_prefix="XOPS_")
    environment: Literal["dev", "prod"] = "dev"
    copilot_host: str = ""  # legacy path-схема: ingress-хост/IP для UI и API копилотов
    copilot_base_domain: str = ""  # host-схема: URL копилота = <scheme>://<name>.<env>.<domain>; пусто → legacy path
    copilot_scheme: Literal["http", "https"] = "http"  # флип на https во 2-й фазе (TLS)
    internal_gateway: str = ""  # напр. http://traefik.kube-system — server-side вызовы без hairpin (через Host-заголовок)
    platform_namespace: str = ""  # собственный неймспейс — исключается из discovery
    integration_timeout: float = Field(default=8.0, gt=0, le=30)
    chat_timeout: float = Field(default=60.0, gt=0, le=300)
    database_url: SecretStr = SecretStr("")
    admin_password_hash: SecretStr = SecretStr("")
    base_path: str = ""
    cookie_secure: bool = False
    session_hours: int = Field(default=12, ge=1, le=168)
