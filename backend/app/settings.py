"""Настройки discovery Kubernetes и интеграций для dev/prod."""

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Параметры интеграций, задаваемые переменными окружения."""

    model_config = SettingsConfigDict(env_prefix="XOPS_")
    environment: Literal["dev", "prod"] = "dev"
    copilot_host: str = ""  # существующий ingress-хост для UI и API копилотов
    platform_namespace: str = ""  # собственный неймспейс — исключается из discovery
    integration_timeout: float = Field(default=8.0, gt=0, le=30)
    chat_timeout: float = Field(default=60.0, gt=0, le=300)
