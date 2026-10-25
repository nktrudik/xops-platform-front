# XOps Platform

## Описание проекта

Каталог зарегистрированных в Kubernetes Copilot-ов: поиск, встроенные UI, универсальный чат и внешние продукты. Источник каталога — Kubernetes; статических карточек и демонстрационных ответов нет.

## Запуск

В кластере backend использует существующий ServiceAccount и read-only RBAC из `k3s/rbac.yaml`. Каталог доступен после входа по `GET /dev/platform-xops/api/copilots`; это API платформы, а не отдельный upstream. Каталог обновляется во Vue каждые 30 секунд.

Для запуска нужны доступ к кластеру и kubeconfig с достижимым адресом API. Скопируйте `.env.example` в `.env`, задайте случайный `POSTGRES_PASSWORD` и сгенерируйте хеш пароля администратора:

```sh
cd backend
poetry install --with dev
poetry run python -m app.auth
```

Команда запрашивает пароль скрытым вводом и выводит только scrypt-хеш. Запишите его в `XOPS_ADMIN_PASSWORD_HASH` в `.env` **в одинарных кавычках**, чтобы сохранить символы `$`. Затем из корня:

```sh
docker compose up --build -d
docker compose down
```

Локально: http://localhost:8080; Swagger: http://localhost:8080/api/docs. Compose запускает frontend, backend и одну PostgreSQL. Без доступа к Kubernetes каталог возвращает 503; PostgreSQL и корректный хеш обязательны для входа.

## Вход и хранение данных

Пользователь один: `admin`, роль `admin`. Пароля по умолчанию нет. Хеш хранится в настройках и таблице пользователя; открытый пароль не сохраняется. Сессия — случайная HttpOnly-cookie с `SameSite=Strict`, в БД хранится только её хеш. Изменяющие запросы требуют `X-XOps-CSRF`, полученный при входе или `GET /api/auth/me`. Вход и выход: `POST /api/auth/login` и `POST /api/auth/logout`. После выхода сессия отзывается на сервере. После смены хеша и перезапуска backend старые сессии отзываются. Срок сессии — 12 часов (`XOPS_SESSION_HOURS`). Для HTTPS включите `XOPS_COOKIE_SECURE=true`; DEV с HTTP использует `false`.

Каталог, проверка embedded UI и все API диалогов защищены проверкой сессии на backend. Состояние здоровья и схема API не содержат пользовательских данных. В кластере `XOPS_BASE_PATH=/<env>/platform-xops` ограничивает cookie путём платформы.

Одна база содержит `users`, `sessions`, `conversations`, `messages` для всех копилотов. Схема создаётся автоматически транзакционно из `backend/app/schema.sql`; обычный запуск не пересоздаёт таблицы. Compose хранит данные в volume `postgres-data`, Kubernetes — в PVC StatefulSet `postgres`. Обычные `up`, `down` и обновления образов сохраняют историю. `down -v` и удаление PVC удаляют данные. Изменение `POSTGRES_PASSWORD` в настройках не меняет пароль уже созданного PostgreSQL — его ротация выполняется отдельно.

В DEV pipeline нужны защищённые переменные `POSTGRES_PASSWORD` и `XOPS_ADMIN_PASSWORD_HASH` с отключённым раскрытием `$`. Deploy создаёт Secret `<COPILOT_NAME>-credentials`; уже созданный вручную Secret также поддерживается. Значения секретов в Git не хранятся. Добавлены только PostgreSQL, его доступ внутри неймспейса и readiness backend; существующая схема развёртывания сохранена!

## Диалоги универсального чата

Создавайте новый диалог или выбирайте сохранённый в боковой панели. История и контекст принадлежат backend; frontend не хранит их постоянно. При открытии загружаются последние 30 сообщений, при прокрутке вверх — предыдущие страницы. В окне браузера остаётся до 150 сообщений; кнопка «К последним сообщениям» возвращает к актуальной части диалога.

- `GET/POST /api/copilots/{id}/conversations` — список по 20 диалогов и создание нового.
- `DELETE /api/copilots/{id}/conversations/{conversation_id}` — удаление своего диалога и всех его сообщений. В UI — кнопка корзины и подтверждение; во время подготовки ответа удаление отклоняется с 409.
- `GET /api/copilots/{id}/conversations/{conversation_id}/messages?before=<id>` — страница истории и `next_before` для следующей.
- `POST /api/copilots/{id}/chat?conversation_id=<uuid>` — прежний JSON `{"messages":[{"role":"user","content":"Новый вопрос"}]}` плюс заголовок `Idempotency-Key: <uuid>`. Для повтора сохраняйте тот же ключ и текст. Контекст собирается из БД: последние 100 сообщений вместе с новым вопросом.

Вопрос сохраняется перед вызовом копилота. После ошибки можно повторить последний запрос или сразу отправить новый вопрос в том же диалоге. Вопросы без ответа сохраняются с пометкой ошибки и не включаются в контекст нового запроса. Повтор старого неудачного запроса после новых сообщений отклоняется с 409. Сообщения не дублируются, завершённый ответ возвращается из БД. Одновременная отправка в один диалог получает 409. Если БД не подтвердила запись ответа, успех клиенту не возвращается; при повторе копилот может быть вызван снова, но записи истории не дублируются. Старый вызов `/chat` без `conversation_id` создаёт отдельный диалог и возвращает его ID в `X-Conversation-ID`; для надёжного повтора используйте созданный заранее диалог.

Все чтения и отправки проверяют пользователя и Copilot диалога. Собственные диалоги `embedded` и `external` платформа не перехватывает; этим приложениям PostgreSQL платформы не требуется.

## Настройки

В кластере существующий pipeline передаёт `XOPS_ENVIRONMENT`, `XOPS_COPILOT_HOST` и `XOPS_PLATFORM_NAMESPACE`. Backend читает `copilot-meta` из неймспейсов `<COPILOT_NAME>-<environment>` и готовность Deployment; собственный неймспейс платформы исключается. Новые адреса каталога добавлять не нужно.

Для Compose: `KUBECONFIG_FILE` — путь к существующему kubeconfig, `XOPS_COPILOT_HOST` — существующий ingress-хост без схемы, `XOPS_PLATFORM_NAMESPACE` — неймспейс платформы. `XOPS_PORT` задаёт локальный порт. В кластере kubeconfig не требуется.

Шрифты МТС и гайды исключены из Git и Docker-контекстов. Локальные шрифты при необходимости подключаются через `MTS_FONTS_DIR` read-only.

## Архитектура

- `frontend/`: Vue 3 + TypeScript, HTTP-каталог и чат, Nginx проксирует `/api` в backend. Все API-запросы учитывают префикс платформы `/<env>/platform-xops/`.
- `backend/`: FastAPI + Poetry; `app/main.py` содержит HTTP-маршруты, `app/kubernetes.py` читает регистрации, `app/discovery.py` проверяет их для каталога. `app/chat_models.py` задаёт единый контракт чата, `app/chat.py` передаёт запрос копилоту, `app/embedding.py` проверяет встроенные UI.
- `app/auth.py` отвечает за вход и сессии, `app/database.py` — за пул PostgreSQL и схему, `app/history.py` — за диалоги, пагинацию и безопасную отправку. Дополнительного ORM, Redis и очередей нет.
- `app/models.py`: модели каталога и регистрации. Для `chat` и `external` модель интерфейса общая; для `embedded` путь из метаданных преобразуется в абсолютный URL. Непроверенные данные Kubernetes не выдаются frontend напрямую.
- `k3s/`: существующие манифесты; файловый mock-каталог и его ConfigMap удалены. При ошибке API последние данные остаются видны с уведомлением; пустой каталог не заменяется примерами.

## Конфигурация Copilot-а

В `copilot.yaml` обязательны `display_name`, `description`, `interface.type`. Системное имя задаётся через `COPILOT_NAME` и в YAML не дублируется.

```yaml
display_name: Помощник команды
description: Отвечает на вопросы команды
interface:
  type: chat
```

```yaml
display_name: База знаний
description: Документация продукта
interface:
  type: external
  url: https://docs.company.example/product
```

Для собственного UI: `interface: {type: embedded, path: /}`. Неизвестный или отсутствующий тип считается ошибкой конфигурации.

Существующий discovery читает **ConfigMap `copilot-meta` в неймспейсе копилота**, ключ **`metadata.json`**: JSON-эквивалент этих YAML-полей. Pipeline копилота должен сформировать эту регистрацию из `copilot.yaml`; сама платформа не читает файлы из контейнеров копилотов. Необязательное поле `icon` в `metadata.json`: `sparkles`, `code`, `layers`, `document`, `chart`, `compass`. После регистрации карточка появляется на следующем polling. Без готовых Deployment карточка остаётся со статусом «Недоступен»; некорректные метаданные показываются как ошибка.

## Контракт универсального чата

Копилот реализует **`POST /v1/chat/completions`**.

Запрос платформы к копилоту:

```json
{"messages":[{"role":"user","content":"Вопрос пользователя"}]}
```

Ответ копилота, HTTP 200 и `Content-Type: application/json`:

```json
{"reply":"Ответ пользователю"}
```

Минимальная реализация в модуле копилота, где уже объявлен `app`:

```python
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


@app.post("/v1/chat/completions")
async def chat(request: ChatRequest) -> dict[str, str]:
    question = request.messages[-1].content
    return {"reply": f"Вы спросили: {question}"}
```

Замените вычисление ответа вызовом своего копилота. `request.messages` содержит историю с ролями `user`/`assistant`. Инструкции и доступ к LLM настраиваются самим копилотом. Ошибки возвращаются с HTTP 4xx/5xx. Поле `reply` должно содержать непустую строку; UUID, timestamp и другие служебные поля не нужны. Streaming пока не поддерживается.

Frontend вызывает **`POST /api/copilots/{id}/chat`** платформы с `{"messages":[...]}` и получает `{"reply":"..."}`. Через ingress путь начинается с `/<env>/platform-xops/`. Backend проверяет регистрацию и собирает контекст сохранённого диалога. Контракт API копилота остаётся прежним: только `messages` на входе и `reply` на выходе. Передаются последние 100 сообщений; вопрос — до 4000 символов, ответ копилота — до 64000. Последнее сообщение — `user`. Таймаут backend — 60 секунд (`XOPS_CHAT_TIMEOUT`, максимум 300). Внешний путь вызова копилота по-прежнему заканчивается на `/api/v1/chat/completions`; если его gateway удаляет `/api`, внутри FastAPI используется показанный выше `/v1/chat/completions`.

## Проверки и ограничения

```sh
docker compose --profile test run --rm --build frontend-checks
docker compose --profile test run --rm --build backend-checks
```

Без запуска приложения: `cd frontend && npm run check && npm run build`; `cd backend && poetry run ruff check . && poetry run ruff format --check . && poetry run mypy . && poetry run bandit -r app && poetry run pytest`.

Интеграционные тесты запускаются при заданном `XOPS_TEST_DATABASE_URL` к отдельной тестовой PostgreSQL (пароль можно передать через `PGPASSWORD`). Каждый использует собственную временную схему. Они проверяют вход/выход, ограничения доступа, восстановление, пагинацию, повторы, продолжение после ошибки и удаление диалогов. Без этой переменной они пропускаются; остальные проверки не требуют БД и Kubernetes.
