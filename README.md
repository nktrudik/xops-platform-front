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
- `backend/`: FastAPI + Poetry; `app/kubernetes.py` читает реальные регистрации, `app/discovery.py` проверяет метаданные, `app/chat.py` вызывает API выбранного копилота.
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

Копилот реализует **`POST /v1/chat/completions`** относительно своего backend API. Это текстовое непотоковое подмножество [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

В существующей ingress-схеме полный адрес: **`/<env>/<COPILOT_NAME>/api/v1/chat/completions`**. Backend платформы сам строит его из discovery; прописывать отдельный URL в `copilot.yaml` не нужно. `model` — системное имя `COPILOT_NAME`: копилот должен принимать этот идентификатор, даже если внутри использует другую LLM.

Запрос платформы к копилоту:

```json
{"model":"<COPILOT_NAME>","messages":[{"role":"user","content":"Вопрос пользователя"}],"stream":false}
```

Ответ копилота, HTTP 200 и `Content-Type: application/json`:

```json
{
  "id": "chatcmpl-unique-id",
  "object": "chat.completion",
  "created": 1730000000,
  "model": "<COPILOT_NAME>",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Ответ пользователю"},
    "finish_reason": "stop"
  }]
}
```

`id` уникален для ответа, `created` — Unix timestamp в секундах. Backend показывает текст `choices[0].message.content`; допускаются дополнительные стандартные поля, включая `usage`. Поддерживаются текстовые роли `user`/`assistant`, `finish_reason`: `stop`, `length`, `content_filter`. Streaming, tools, мультимодальность пока не поддерживаются. Внутренние инструкции и доступ к LLM настраиваются самим копилотом. Ошибки копилота возвращаются с HTTP 4xx/5xx, а не как успешный текстовый ответ.

Frontend вызывает **`POST /api/copilots/{id}/chat`** платформы с `{"messages":[...]}` и получает `{"reply":"..."}`. Через ingress путь начинается с `/<env>/platform-xops/`. Адрес и модель задаёт backend, frontend не обращается к API копилота напрямую. Передаются последние 100 сообщений; вопрос — до 4000 символов, ответ копилота — до 64000. Последнее сообщение — `user`. Таймаут backend по умолчанию 60 секунд (`XOPS_CHAT_TIMEOUT`, максимум 300). При отсутствии ручки, сетевой ошибке, таймауте или некорректном JSON отображается ошибка с повтором.

## Проверки и ограничения

```sh
docker compose --profile test run --rm --build frontend-checks
docker compose --profile test run --rm --build backend-checks
```

Frontend: ESLint, Prettier, vue-tsc, Vitest, `npm run build`, `npm run test:e2e`. Backend: Ruff, Mypy, Bandit, Pytest. Подмены API используются только в автоматических тестах. Нет mock-режима, SSO, БД и серверного хранения истории чата. Для живой проверки chat-ответа нужен зарегистрированный копилот с реализованной ручкой выше; существование каталога само по себе не означает наличие chat API.
