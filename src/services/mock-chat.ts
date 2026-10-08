import type { ChatGateway } from '../domain/copilot'

export function createMockChatGateway(delayMs = 650): ChatGateway {
  return {
    async reply(copilot, messages, signal) {
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException('Отменено', 'AbortError'))
        const onAbort = (): void => {
          clearTimeout(timer)
          reject(new DOMException('Отменено', 'AbortError'))
        }
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort)
          resolve()
        }, delayMs)
        signal.addEventListener('abort', onAbort, { once: true })
      })
      const question = messages.findLast((message) => message.role === 'user')?.content ?? ''
      return `Это демонстрационный ответ Copilot «${copilot.name}».\n\nВаш запрос: «${question}».\n\nДля начала уточните цель, исходные данные и ожидаемый результат. Затем разбейте задачу на небольшие шаги и определите критерии проверки.\n\nСейчас чат работает в mock-режиме. Ответы реального AI появятся после подключения API.`
    },
  }
}
