# XOps Platform

## Описание проекта

Каталог зарегистрированных в Kubernetes Copilot-ов: поиск, встроенные UI, универсальный чат и внешние продукты. Источник каталога — Kubernetes; статических карточек и демонстрационных ответов нет.

## Запуск

В кластере backend использует существующий ServiceAccount и read-only RBAC из `k3s/rbac.yaml`. Каталог уже доступен на машине по `GET /dev/platform-xops/api/copilots`; это API платформы, а не отдельный upstream, который нужно регистрировать. Каталог обновляется во Vue каждые 30 секунд.

Для локального запуска нужны доступ к настоящему кластеру и kubeconfig с встроенными сертификатами и достижимым адресом API. Задайте переменные по `.env.example`, затем:

```sh
docker compose up --build -d
docker compose down
```

Локально: http://localhost:8080; Swagger платформы: http://localhost:8080/api/docs. Без доступа к Kubernetes каталог возвращает 503 с сообщением об ошибке.

## Настройки

В кластере существующий pipeline передаёт `XOPS_ENVIRONMENT`, `XOPS_COPILOT_HOST` и `XOPS_PLATFORM_NAMESPACE`. Backend читает `copilot-meta` из неймспейсов `<COPILOT_NAME>-<environment>` и готовность Deployment; собственный неймспейс платформы исключается. Новые адреса каталога добавлять не нужно.

Для Compose: `KUBECONFIG_FILE` — путь к существующему kubeconfig, `XOPS_COPILOT_HOST` — существующий ingress-хост без схемы, `XOPS_PLATFORM_NAMESPACE` — неймспейс платформы. `XOPS_PORT` задаёт локальный порт. В кластере kubeconfig не требуется.

Шрифты МТС и гайды исключены из Git и Docker-контекстов. Локальные шрифты при необходимости подключаются через `MTS_FONTS_DIR` read-only.

## Архитектура

- `frontend/`: Vue 3 + TypeScript, HTTP-каталог и чат, Nginx проксирует `/api` в backend. Все API-запросы учитывают префикс платформы `/<env>/platform-xops/`.
- `backend/`: FastAPI + Poetry; `app/main.py` содержит HTTP-маршруты, `app/kubernetes.py` читает регистрации, `app/discovery.py` проверяет их для каталога. `app/chat_models.py` задаёт единый контракт чата, `app/chat.py` передаёт запрос копилоту, `app/embedding.py` проверяет встроенные UI.
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

Frontend вызывает **`POST /copilots/{id}/chat`** платформы с `{"messages":[...]}` и получает `{"reply":"..."}`. Через ingress путь начинается с `/<env>/platform-xops/`. Backend проверяет регистрацию и передаёт эти же сообщения в API копилота. Передаются последние 100 сообщений; вопрос — до 4000 символов, ответ копилота — до 64000. Последнее сообщение — `user`. Таймаут backend по умолчанию 60 секунд (`XOPS_CHAT_TIMEOUT`, максимум 300). При отсутствии ручки, сетевой ошибке, таймауте или некорректном JSON отображается ошибка с повтором.

## Проверки и ограничения

```sh
docker compose --profile test run --rm --build frontend-checks
docker compose --profile test run --rm --build backend-checks
```
