import type { ChatGateway, Conversation, StoredMessage } from '../domain/copilot'
import { api, record } from './api'

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Некорректная история диалога.')
  return value
}

function cursor(value: unknown): string | null {
  return value === null ? null : text(value)
}

function conversation(value: unknown): Conversation {
  const item = record(value)
  return {
    id: text(item.id),
    title: text(item.title),
    created_at: text(item.created_at),
    updated_at: text(item.updated_at),
  }
}

function message(value: unknown): StoredMessage {
  const item = record(value)
  if (
    (item.role !== 'user' && item.role !== 'assistant') ||
    !['pending', 'failed', 'complete'].includes(text(item.status))
  )
    throw new Error('Некорректное сообщение диалога.')
  return {
    id: text(item.id),
    role: item.role,
    content: text(item.content),
    request_id: text(item.request_id),
    status: item.status as StoredMessage['status'],
    error: cursor(item.error),
    created_at: text(item.created_at),
  }
}

/** Сервер управляет историей; браузер передаёт только новый вопрос и ключ повтора. */
export function createChatGateway(): ChatGateway {
  const base = (id: string) => `copilots/${encodeURIComponent(id)}`
  return {
    async list(id, before, signal) {
      const result = record(
        await api(
          `${base(id)}/conversations${before ? `?before=${encodeURIComponent(before)}` : ''}`,
          { signal },
        ),
      )
      if (!Array.isArray(result.conversations)) throw new Error('Не удалось прочитать диалоги.')
      return {
        conversations: result.conversations.map(conversation),
        next_before: cursor(result.next_before),
      }
    },
    async create(id, signal) {
      return conversation(await api(`${base(id)}/conversations`, { method: 'POST', signal }))
    },
    async remove(id, conversationId, signal) {
      await api(`${base(id)}/conversations/${encodeURIComponent(conversationId)}`, {
        method: 'DELETE',
        signal,
      })
    },
    async messages(id, conversationId, before, signal) {
      const result = record(
        await api(
          `${base(id)}/conversations/${encodeURIComponent(conversationId)}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
          { signal },
        ),
      )
      if (!Array.isArray(result.messages)) throw new Error('Не удалось прочитать историю.')
      return { messages: result.messages.map(message), next_before: cursor(result.next_before) }
    },
    async send(id, conversationId, requestId, content, signal) {
      const result = record(
        await api(
          `${base(id)}/chat?conversation_id=${encodeURIComponent(conversationId)}`,
          {
            method: 'POST',
            headers: { 'Idempotency-Key': requestId },
            signal: AbortSignal.any([signal, AbortSignal.timeout(310000)]),
            body: JSON.stringify({ messages: [{ role: 'user', content }] }),
          },
          310000,
        ),
      )
      if (!text(result.reply).trim()) throw new Error('Некорректный ответ Copilot.')
    },
  }
}
