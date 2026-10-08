import type { CatalogRepository, Copilot, CopilotIcon, CopilotStatus } from '../domain/copilot'

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Некорректный ответ каталога.')
  }
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Отсутствует обязательное поле каталога.')
  return value
}

function applicationUrl(value: unknown): string {
  const address = text(value)
  const url = new URL(address)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Некорректный адрес приложения.')
  }
  return address
}

/** Проверяет HTTP-контракт; неизвестный интерфейс никогда не становится чатом. */
export function parseCatalog(value: unknown): readonly Copilot[] {
  if (!Array.isArray(value)) throw new Error('Некорректный ответ каталога.')
  const statuses: readonly string[] = [
    'available',
    'maintenance',
    'coming-soon',
    'unavailable',
    'configuration-error',
  ]
  const icons: readonly string[] = ['sparkles', 'code', 'layers', 'document', 'chart', 'compass']
  const items = value.map((entry: unknown): Copilot => {
    const item = record(entry)
    const status = text(item.status)
    const icon = text(item.icon)
    if (!statuses.includes(status) || !icons.includes(icon))
      throw new Error('Некорректные поля каталога.')
    const base = {
      id: text(item.id),
      name: text(item.display_name),
      description: text(item.description),
      status: status as CopilotStatus,
      icon: icon as CopilotIcon,
    }
    if (item.interface === null && status === 'configuration-error') {
      return {
        ...base,
        interfaceType: null,
        applicationUrl: null,
        configurationError: text(item.configuration_error),
      }
    }
    const ui = record(item.interface)
    if (ui.type === 'chat') return { ...base, interfaceType: 'chat', applicationUrl: null }
    if (ui.type === 'embedded' || ui.type === 'external') {
      return { ...base, interfaceType: ui.type, applicationUrl: applicationUrl(ui.url) }
    }
    throw new Error('Интерфейс Copilot не настроен.')
  })
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error('Повторяющиеся идентификаторы Copilot.')
  return items
}

export function createCatalogRepository(): CatalogRepository {
  return {
    async list(signal?: AbortSignal): Promise<readonly Copilot[]> {
      const timeout = AbortSignal.timeout(10000)
      const response = await fetch('/api/copilots', {
        cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
      if (!response.ok) throw new Error('API каталога недоступен.')
      const data: unknown = await response.json()
      return parseCatalog(data)
    },
  }
}
