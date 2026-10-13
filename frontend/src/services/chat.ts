import type { ChatGateway } from '../domain/copilot'

/** Универсальный чат обращается к копилоту только через backend платформы. */
export function createChatGateway(): ChatGateway {
  return {
    async reply(copilot, messages, signal): Promise<string> {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/copilots/${encodeURIComponent(copilot.id)}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.any([signal, AbortSignal.timeout(310000)]),
          body: JSON.stringify({
            messages: messages.slice(-100).map(({ role, content }) => ({ role, content })),
          }),
        },
      )
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const detail =
          typeof result === 'object' &&
          result !== null &&
          'detail' in result &&
          typeof result.detail === 'string'
            ? result.detail
            : 'Не удалось получить ответ Copilot.'
        throw new Error(detail)
      }
      if (
        typeof result !== 'object' ||
        result === null ||
        !('reply' in result) ||
        typeof result.reply !== 'string' ||
        !result.reply.trim()
      ) {
        throw new Error('Некорректный ответ Copilot.')
      }
      return result.reply
    },
  }
}
