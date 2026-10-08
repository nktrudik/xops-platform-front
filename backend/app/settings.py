"""Настройки только локального DEV-окружения."""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Пути и параметры интеграций, задаваемые переменными окружения."""

    model_config = SettingsConfigDict(env_prefix="XOPS_")
    environment: Literal["dev"] = "dev"
    catalog_file: Path = Path("data/copilots.json")
    integration_timeout: float = Field(default=8.0, gt=0, le=30)
