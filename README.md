# XOps Platform

## Описание проекта

Единый каталог AI Copilot-ов: поиск, встроенные приложения, универсальный чат и ссылки на внешние продукты. Существующий интерфейс и стили МТС сохранены.

## Локальный запуск

```sh
docker compose up --build -d
docker compose down
```

Платформа: http://localhost:8080. Документация API: http://localhost:8080/api/docs. Работает только локальное DEV-окружение.

## Настройка адресов

Адреса и статусы задаются в `backend/data/copilots.json`; файл перечитывается при каждом запросе без пересборки контейнеров. Для embedded используются `base_url` и `metadata.interface.path`, для external — `metadata.interface.url`.

Порт (`XOPS_PORT`) и путь к локальным шрифтам (`MTS_FONTS_DIR`) можно задать в `.env` по примеру `.env.example`. По умолчанию шрифты подключаются из `mts_shrift/ШРИФТ/Web` как read-only volume; шрифты и гайды исключены из Git и контекстов Docker.

Test Agent Alpha: http://2.59.80.61/dev/test-agent-alpha; его Swagger: http://2.59.80.61/dev/test-agent-alpha/api/docs.

## Архитектура

- `frontend/`: Vue 3 + TypeScript. Nginx отдаёт UI и направляет `/api` в backend. Каталог запрашивается по HTTP каждые 30 секунд; при сбое сохраняются последние данные и доступен повтор.
- `backend/`: Python 3.13, FastAPI, Poetry. `GET /api/copilots` преобразует discovery и валидирует метаданные. Проверка iframe выполняется через `/api/copilots/{id}/embedding-check`.
- `backend/app/discovery.py`: заменяемый источник `CopilotSource`; сейчас используется изменяемый JSON mock. В будущем Kubernetes-адаптер заменит источник, сохранив API и бизнес-логику.
- `compose.yaml`: общий локальный запуск двух сервисов и профиля проверок.

## Добавление Copilot-а

Пример контракта: `backend/examples/copilot.yaml`. Обязательны `display_name`, `description`, `interface.type`. Системное имя из `COPILOT_NAME` относится к discovery и в YAML не дублируется.

```yaml
display_name: Test Copilot
description: Тестовый Copilot
interface:
  type: embedded
  path: /
```

Другие варианты: `interface: {type: chat}` или `interface: {type: external, url: https://example.com}`. Неизвестный или отсутствующий тип отображается как ошибка конфигурации.

Для DEV добавьте запись в `backend/data/copilots.json`: `copilot_name`, `status`, `icon`, `metadata` с полями YAML и `base_url` для embedded. Статусы: `available`, `maintenance`, `coming-soon`, `unavailable`. Добавления, удаления и смена статуса отражаются в каталоге на следующем polling без изменения Vue-кода. Зарегистрированный недоступный Copilot остаётся в каталоге. Пустой массив означает пустой каталог.

## Проверки качества

```sh
docker compose --profile test run --rm --build frontend-checks
docker compose --profile test run --rm --build backend-checks
docker compose --profile test run --rm --build e2e
```

Frontend: `npm run check` (ESLint, Prettier, vue-tsc, Vitest), `npm run build`, `npm run security`. Backend: `poetry run ruff check .`, `poetry run ruff format --check .`, `poetry run mypy .`, `poetry run bandit -r app`, `poetry run pytest`. Команды выполняются в соответствующей директории; Docker использует lock-файлы.

## Временные интеграции и ограничения

Discovery, статусы, чат и пользовательский профиль — mock; Figma ведёт на демонстрационный внешний адрес. Test Agent Alpha — реальное внешнее приложение; его недоступность или запрет iframe не мешают работе платформы. Каждое открытие и повтор iframe получают новый URL документа, обходящий прежний HTTP-кеш. Kubernetes, CI/CD, production deployment, авторизация/SSO, реальные chat API и хранение истории пока не подключены. Обработку YAML будущим pipeline реализует другая команда.
