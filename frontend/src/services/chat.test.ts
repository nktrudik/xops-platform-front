import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChatGateway } from './chat'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('HTTP-чат', () => {
  it('отправляет новый вопрос с идентификаторами диалога и повтора', async () => {
    vi.stubEnv('BASE_URL', '/dev/platform-xops/')
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: 'Ответ API' })))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    await createChatGateway().send('chat-test', 'conversation', 'request', 'Вопрос', signal)
    expect(fetch).toHaveBeenCalledWith(
      '/dev/platform-xops/api/copilots/chat-test/chat?conversation_id=conversation',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Вопрос' }] }),
      }),
    )
    expect((fetch.mock.calls[0]?.[1]?.headers as Headers).get('Idempotency-Key')).toBe('request')
  })

  it('показывает ошибку backend без выдуманного ответа', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: 'Ручка отсутствует' }), { status: 502 }),
        ),
    )
    await expect(
      createChatGateway().send(
        'chat-test',
        'conversation',
        'request',
        'Вопрос',
        new AbortController().signal,
      ),
    ).rejects.toThrow('Ручка отсутствует')
  })

  it('не принимает пустой или повреждённый ответ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: '' }))))
    await expect(
      createChatGateway().send(
        'chat-test',
        'conversation',
        'request',
        'Вопрос',
        new AbortController().signal,
      ),
    ).rejects.toThrow('Некорректный ответ')
  })

  it.each([
    [200, 'Некорректный ответ сервера.'],
    [502, 'Не удалось выполнить запрос.'],
  ])('объясняет не-JSON ответ с HTTP %s', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', { status })))
    await expect(
      createChatGateway().send(
        'chat-test',
        'conversation',
        'request',
        'Вопрос',
        new AbortController().signal,
      ),
    ).rejects.toThrow(message)
  })
})
