import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChatGateway } from './chat'
import { testCopilots } from '../../tests/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('HTTP-чат', () => {
  it('отправляет историю через backend с префиксом платформы и получает реальный текст', async () => {
    vi.stubEnv('BASE_URL', '/dev/platform-xops/')
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: 'Ответ API' })))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    expect(
      await createChatGateway().reply(
        testCopilots[2]!,
        [{ id: '1', role: 'user', content: 'Вопрос' }],
        signal,
      ),
    ).toBe('Ответ API')
    expect(fetch).toHaveBeenCalledWith(
      '/dev/platform-xops/api/copilots/chat-test/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Вопрос' }] }),
      }),
    )
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
      createChatGateway().reply(testCopilots[2]!, [], new AbortController().signal),
    ).rejects.toThrow('Ручка отсутствует')
  })

  it('не принимает пустой или повреждённый ответ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: '' }))))
    await expect(
      createChatGateway().reply(testCopilots[2]!, [], new AbortController().signal),
    ).rejects.toThrow('Некорректный ответ')
  })

  it.each([
    [200, 'Некорректный ответ Copilot.'],
    [502, 'Не удалось получить ответ Copilot.'],
  ])('объясняет не-JSON ответ с HTTP %s', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', { status })))
    await expect(
      createChatGateway().reply(testCopilots[2]!, [], new AbortController().signal),
    ).rejects.toThrow(message)
  })
})
