import { ref } from 'vue'

export interface Session {
  id: number
  username: string
  role: 'admin'
  csrf_token: string
}

export const session = ref<Session | null>(null)
let restored: Promise<void> | undefined

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Некорректный ответ сервера.')
  return value as Record<string, unknown>
}

/** Cookie остаётся HttpOnly; в памяти страницы хранится только CSRF-токен. */
export async function api(
  path: string,
  options: RequestInit = {},
  timeout = 15000,
): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (session.value) headers.set('X-XOps-CSRF', session.value.csrf_token)
  const response = await fetch(`${import.meta.env.BASE_URL}api/${path}`, {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(timeout)])
      : AbortSignal.timeout(timeout),
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (response.status === 401) session.value = null
  if (response.status === 204) return null
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = result && typeof result === 'object' && 'detail' in result ? result.detail : null
    throw new Error(
      typeof detail === 'string' ? detail : 'Не удалось выполнить запрос. Повторите попытку.',
    )
  }
  return result
}

function parseSession(value: unknown): Session {
  const item = record(value)
  if (
    typeof item.id !== 'number' ||
    typeof item.username !== 'string' ||
    item.role !== 'admin' ||
    typeof item.csrf_token !== 'string'
  )
    throw new Error('Некорректная сессия.')
  return { id: item.id, username: item.username, role: item.role, csrf_token: item.csrf_token }
}

export function restoreSession(): Promise<void> {
  restored ??= api('auth/me', { signal: AbortSignal.timeout(10000) })
    .then((value) => {
      session.value = parseSession(value)
    })
    .catch(() => {
      session.value = null
    })
  return restored
}

export async function login(username: string, password: string): Promise<void> {
  session.value = parseSession(
    await api('auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(15000),
    }),
  )
}

export async function logout(): Promise<void> {
  await api('auth/logout', { method: 'POST', signal: AbortSignal.timeout(10000) })
  session.value = null
}
