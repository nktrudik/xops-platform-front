"""Проверка HTTP-доступности UI и ограничений встраивания без загрузки тела страницы."""

import asyncio
from urllib.parse import urlsplit

import httpx

from app.models import EmbeddingResult, validate_http_url


def origin(url: str) -> str:
    """Возвращает origin адреса для сравнения политик браузера."""
    parsed = urlsplit(url)
    port = parsed.port
    suffix = f":{port}" if port and port != {"http": 80, "https": 443}.get(parsed.scheme) else ""
    hostname = parsed.hostname or ""
    if ":" in hostname:
        hostname = f"[{hostname}]"
    return f"{parsed.scheme}://{hostname}{suffix}".lower()


def allows_source(source: str, application_url: str, parent_origin: str) -> bool:
    """Проверяет источник frame-ancestors для непосредственного родителя iframe."""
    if source == "*":
        return True
    if source == "'self'":
        return origin(application_url) == parent_origin
    if source in {"http:", "https:"}:
        return parent_origin.startswith(source)
    try:
        parent = urlsplit(parent_origin)
        normalized = source[:-2] if source.endswith(":*") else source
        candidate = urlsplit(
            normalized
            if "://" in normalized
            else f"{urlsplit(application_url).scheme}://{normalized}"
        )
        hostname = candidate.hostname or ""
        host_matches = (
            (parent.hostname or "").endswith(hostname[1:])
            if hostname.startswith("*.")
            else parent.hostname == hostname
        )
        default_port = {"http": 80, "https": 443}
        port_matches = source.endswith(":*") or (
            (candidate.port or default_port.get(candidate.scheme))
            == (parent.port or default_port.get(parent.scheme))
        )
        return candidate.scheme == parent.scheme and host_matches and port_matches
    except ValueError:
        return False


def embedding_restriction(headers: httpx.Headers, url: str, parent_origin: str) -> str | None:
    """CSP имеет приоритет над X-Frame-Options, как в современных браузерах."""
    policies = headers.get_list("content-security-policy", split_commas=True)
    found_ancestors = False
    for policy in policies:
        for part in policy.split(";"):
            tokens = part.strip().split()
            if not tokens or tokens[0].lower() != "frame-ancestors":
                continue
            found_ancestors = True
            if not any(allows_source(source, url, parent_origin) for source in tokens[1:]):
                return "Приложение запрещает встраивание (Content-Security-Policy)."
            break
    if found_ancestors:
        return None
    options = headers.get("x-frame-options", "").upper()
    if "DENY" in options or ("SAMEORIGIN" in options and origin(url) != parent_origin):
        return "Приложение запрещает встраивание (X-Frame-Options)."
    return None


async def check_embedding(
    client: httpx.AsyncClient, url: str, parent_origin: str, timeout: float
) -> EmbeddingResult:
    """Проверяет только адрес из discovery; произвольный URL клиента не принимается."""
    try:
        async with asyncio.timeout(timeout):
            for _ in range(6):
                try:
                    validate_http_url(url)
                except ValueError:
                    return EmbeddingResult(
                        state="blocked", reason="Приложение использует неподдерживаемый адрес."
                    )
                if parent_origin.startswith("https:") and url.startswith("http:"):
                    return EmbeddingResult(
                        state="blocked",
                        reason="Браузер блокирует HTTP-приложение на HTTPS-странице.",
                    )
                async with client.stream(
                    "GET",
                    url,
                    follow_redirects=False,
                    headers={"Cache-Control": "no-cache", "Pragma": "no-cache"},
                ) as response:
                    if response.status_code in {301, 302, 303, 307, 308}:
                        location = response.headers.get("location")
                        if not location:
                            break
                        url = str(response.url.join(location))
                        continue
                    if not response.is_success:
                        return EmbeddingResult(
                            state="unavailable",
                            reason=f"Приложение вернуло HTTP {response.status_code}.",
                        )
                    restriction = embedding_restriction(
                        response.headers, str(response.url), parent_origin
                    )
                    if restriction:
                        return EmbeddingResult(state="blocked", reason=restriction)
                    return EmbeddingResult(state="ready")
            return EmbeddingResult(
                state="unavailable", reason="Приложение возвращает некорректные перенаправления."
            )
    except (httpx.HTTPError, TimeoutError, ValueError):
        return EmbeddingResult(
            state="unavailable",
            reason="Приложение недоступно. Проверьте соединение и повторите попытку.",
        )
