import { afterEach, expect, it, vi } from 'vitest'
import { api, login, logout, session } from './api'

afterEach(() => {
  session.value = null
  vi.unstubAllGlobals()
})

it('входит, передаёт CSRF-токен и очищает сессию после выхода', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, username: 'admin', role: 'admin', csrf_token: 'csrf' })),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetch)
  await login('admin', 'password')
  expect(session.value?.username).toBe('admin')
  await logout()
  expect((fetch.mock.calls[1]?.[1]?.headers as Headers).get('X-XOps-CSRF')).toBe('csrf')
  expect(session.value).toBeNull()
})

it('истёкшая сессия очищает доступные в браузере данные аккаунта', async () => {
  session.value = { id: 1, username: 'admin', role: 'admin', csrf_token: 'csrf' }
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Требуется вход' }), { status: 401 }),
      ),
  )
  await expect(api('copilots')).rejects.toThrow('Требуется вход')
  expect(session.value).toBeNull()
})
