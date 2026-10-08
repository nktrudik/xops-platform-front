export type EmbeddingResult =
  { state: 'ready' } | { state: 'blocked' | 'unavailable'; reason: string }

/** Новый адрес документа не переиспользует HTTP-кеш предыдущей загрузки iframe. */
export function freshApplicationUrl(applicationUrl: string): string {
  const url = new URL(applicationUrl)
  url.searchParams.set('_xops_reload', crypto.getRandomValues(new Uint32Array(4)).join('-'))
  return url.href
}

/** Проверка встраивания через backend по идентификатору из каталога. */
export async function checkEmbedding(
  copilotId: string,
  signal: AbortSignal,
): Promise<EmbeddingResult> {
  const response = await fetch(`/api/copilots/${encodeURIComponent(copilotId)}/embedding-check`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Не удалось проверить доступность приложения.')
  const result: unknown = await response.json()
  if (typeof result !== 'object' || result === null || !('state' in result)) {
    throw new Error('Некорректный ответ проверки приложения.')
  }
  if (result.state === 'ready') return { state: 'ready' }
  if (
    (result.state === 'blocked' || result.state === 'unavailable') &&
    'reason' in result &&
    typeof result.reason === 'string'
  ) {
    return { state: result.state, reason: result.reason }
  }
  throw new Error('Некорректный ответ проверки приложения.')
}
