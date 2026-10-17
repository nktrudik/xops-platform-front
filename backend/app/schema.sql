-- Инициализация выполняется в транзакции; существующие данные не пересоздаются.
CREATE TABLE IF NOT EXISTS users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'admin',
    password_hash text NOT NULL,
    failed_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token text NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    copilot_id text NOT NULL,
    title text NOT NULL DEFAULT 'Новый диалог',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_owner
    ON conversations(user_id, copilot_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS messages (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    request_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL CHECK (length(content) BETWEEN 1 AND 64000),
    status text NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'failed', 'complete')),
    error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, request_id, role)
);
CREATE INDEX IF NOT EXISTS messages_history ON messages(conversation_id, id DESC);
