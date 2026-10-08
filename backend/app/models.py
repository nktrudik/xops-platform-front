"""Метаданные copilot.yaml и согласованный контракт каталога."""

from typing import Annotated, Literal
from urllib.parse import unquote, urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator

type Status = Literal[
    "available", "maintenance", "coming-soon", "unavailable", "configuration-error"
]
type Icon = Literal["sparkles", "code", "layers", "document", "chart", "compass"]


def validate_http_url(value: str) -> str:
    """Допускает только абсолютный HTTP/HTTPS-адрес без учётных данных."""
    url = urlsplit(value)
    if url.port == 0:
        raise ValueError("Нужен корректный HTTP/HTTPS-порт")
    if url.scheme not in {"http", "https"} or not url.hostname or url.username or url.password:
        raise ValueError("Нужен HTTP/HTTPS-адрес без учётных данных")
    if any(character.isspace() for character in value):
        raise ValueError("Адрес не должен содержать пробелы")
    return value


class EmbeddedMetadata(BaseModel):
    """Путь UI относительно адреса обнаруженного сервиса."""

    model_config = ConfigDict(extra="forbid")
    type: Literal["embedded"]
    path: str = "/"

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        """Путь не может изменять хост или выходить за префикс сервиса."""
        decoded = unquote(value)
        if (
            not decoded.startswith("/")
            or decoded.startswith("//")
            or "\\" in decoded
            or ".." in urlsplit(decoded).path.split("/")
        ):
            raise ValueError("Нужен путь внутри сервиса, начинающийся с /")
        return value


class ChatMetadata(BaseModel):
    """Универсальный интерфейс чата платформы."""

    model_config = ConfigDict(extra="forbid")
    type: Literal["chat"]


class ExternalMetadata(BaseModel):
    """Ссылка на самостоятельный внешний продукт."""

    model_config = ConfigDict(extra="forbid")
    type: Literal["external"]
    url: str
    _validate_url = field_validator("url")(validate_http_url)


type MetadataInterface = Annotated[
    EmbeddedMetadata | ChatMetadata | ExternalMetadata, Field(discriminator="type")
]


class CopilotMetadata(BaseModel):
    """Обязательные поля copilot.yaml; системное имя приходит из discovery."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    display_name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    interface: MetadataInterface


class Deployment(BaseModel):
    """Запись обнаруженного приложения до проверки его метаданных."""

    copilot_name: str = Field(min_length=1, pattern=r"^[a-z0-9][a-z0-9-]*$")
    status: Literal["available", "maintenance", "coming-soon", "unavailable"]
    base_url: str | None = None
    icon: Icon = "sparkles"
    metadata: dict[str, object]


class EmbeddedInterface(BaseModel):
    """Абсолютный адрес встроенного UI для frontend."""

    type: Literal["embedded"] = "embedded"
    url: str


class ChatInterface(BaseModel):
    """Признак универсального чата в API каталога."""

    type: Literal["chat"] = "chat"


class ExternalInterface(BaseModel):
    """Адрес внешней ссылки в API каталога."""

    type: Literal["external"] = "external"
    url: str


type ApiInterface = Annotated[
    EmbeddedInterface | ChatInterface | ExternalInterface, Field(discriminator="type")
]


class Copilot(BaseModel):
    """Публичный контракт GET /api/copilots."""

    id: str
    display_name: str
    description: str
    status: Status
    icon: Icon
    interface: ApiInterface | None
    configuration_error: str | None = None


class EmbeddingResult(BaseModel):
    """Результат проверки доступности и политики iframe."""

    state: Literal["ready", "blocked", "unavailable"]
    reason: str | None = None
