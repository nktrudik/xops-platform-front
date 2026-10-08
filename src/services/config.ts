export interface RuntimeConfig {
  applications: Readonly<Record<string, string>>
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (typeof value !== 'object' || value === null || !('applications' in value)) {
    throw new Error('Некорректная конфигурация приложений.')
  }
  const applications = value.applications
  if (typeof applications !== 'object' || applications === null || Array.isArray(applications)) {
    throw new Error('Некорректная конфигурация приложений.')
  }
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(applications)) {
    if (typeof value !== 'string' || !['http:', 'https:'].includes(new URL(value).protocol)) {
      throw new Error(`Некорректный адрес приложения «${key}».`)
    }
    result[key] = value
  }
  return { applications: result }
}

export async function loadRuntimeConfig(signal?: AbortSignal): Promise<RuntimeConfig> {
  const response = await fetch('/config.json', { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('Не удалось загрузить конфигурацию платформы.')
  return parseRuntimeConfig(await response.json())
}
