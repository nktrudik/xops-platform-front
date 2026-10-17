import type { Page } from '@playwright/test'
import type { Conversation, StoredMessage } from '../src/domain/copilot'

/** Ответы истории только для существующих браузерных сценариев. */
export async function installHistoryApi(page: Page): Promise<void> {
  const dialogs = new Map<string, Conversation[]>()
  const messages = new Map<string, StoredMessage[]>()
  let sequence = 0
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: 'admin',
        role: 'admin',
        csrf_token: 'test-csrf',
      },
    }),
  )
  await page.route('**/api/copilots/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const copilot = url.pathname.split('/copilots/')[1]?.split('/')[0] ?? ''
    if (url.pathname.endsWith('/conversations')) {
      if (request.method() === 'POST') {
        const now = new Date().toISOString()
        const conversation = {
          id: `dialog-${++sequence}`,
          title: 'Новый диалог',
          created_at: now,
          updated_at: now,
        }
        dialogs.set(copilot, [conversation, ...(dialogs.get(copilot) ?? [])])
        messages.set(conversation.id, [])
        await route.fulfill({ status: 201, json: conversation })
      } else
        await route.fulfill({
          json: { conversations: dialogs.get(copilot) ?? [], next_before: null },
        })
    } else if (url.pathname.endsWith('/messages')) {
      const id = url.pathname.split('/conversations/')[1]?.split('/')[0] ?? ''
      await route.fulfill({ json: { messages: messages.get(id) ?? [], next_before: null } })
    } else if (url.pathname.endsWith('/chat')) {
      const id = url.searchParams.get('conversation_id') ?? ''
      const body = request.postDataJSON() as { messages: { content: string }[] }
      const requestId = request.headers()['idempotency-key'] ?? ''
      const content = body.messages.at(-1)?.content ?? ''
      const history = messages.get(id) ?? []
      if (!history.some((item) => item.request_id === requestId)) {
        for (const role of ['user', 'assistant'] as const) {
          history.push({
            id: String(++sequence),
            request_id: requestId,
            role,
            content: role === 'user' ? content : 'Ответ сервиса',
            status: 'complete',
            error: null,
            created_at: new Date().toISOString(),
          })
        }
        messages.set(id, history)
      }
      await route.fulfill({ json: { reply: 'Ответ сервиса' } })
    } else await route.fallback()
  })
}
