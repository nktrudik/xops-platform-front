export type EmbeddingResult =
  { state: 'ready' } | { state: 'blocked' | 'unavailable'; reason: string }

/** Локальная проверка встраивания, не API Copilot и не источник runtime-статусов. */
export async function checkEmbedding(
  applicationKey: string,
  signal: AbortSignal,
): Promise<EmbeddingResult> {
  const response = await fetch(
    `/internal/embedding-check?application=${encodeURIComponent(applicationKey)}`,
    { signal, cache: 'no-store' },
  )
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
