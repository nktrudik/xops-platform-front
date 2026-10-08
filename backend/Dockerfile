FROM python:3.13-slim-bookworm AS dependencies
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 POETRY_VIRTUALENVS_IN_PROJECT=true
WORKDIR /app
RUN pip install --no-cache-dir 'poetry>=2.2,<3'
COPY pyproject.toml poetry.lock ./
RUN poetry install --only main --no-root --no-interaction

FROM dependencies AS checks
RUN poetry install --with dev --no-root --no-interaction
COPY app ./app
COPY tests ./tests
COPY data ./data
CMD ["sh", "-c", "poetry run ruff check . && poetry run ruff format --check . && poetry run mypy . && poetry run bandit -r app && poetry run pytest"]

FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH"
WORKDIR /app
COPY --from=dependencies /app/.venv ./.venv
COPY app ./app
COPY data ./data
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
