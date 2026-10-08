export type CopilotStatus =
  'available' | 'maintenance' | 'coming-soon' | 'unavailable' | 'configuration-error'
export type CopilotIcon = 'sparkles' | 'code' | 'layers' | 'document' | 'chart' | 'compass'

interface CopilotBase {
  id: string
  name: string
  description: string
  status: CopilotStatus
  icon: CopilotIcon
}

/** Модель UI, полученная из согласованного API каталога. */
export type Copilot = CopilotBase &
  (
    | { interfaceType: 'embedded'; applicationUrl: string }
    | { interfaceType: 'chat'; applicationUrl: null }
    | { interfaceType: 'external'; applicationUrl: string }
    | { interfaceType: null; applicationUrl: null; configurationError: string }
  )

export interface CatalogRepository {
  list(signal?: AbortSignal): Promise<readonly Copilot[]>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ChatGateway {
  reply(copilot: Copilot, messages: readonly ChatMessage[], signal: AbortSignal): Promise<string>
}

export const statusLabels: Record<CopilotStatus, string> = {
  available: 'Доступен',
  maintenance: 'Обслуживание',
  'coming-soon': 'Скоро',
  unavailable: 'Недоступен',
  'configuration-error': 'Ошибка конфигурации',
}

export const interfaceLabels = {
  embedded: 'Собственный интерфейс',
  chat: 'Универсальный чат',
  external: 'Внешний продукт',
}

export function searchCopilots(copilots: readonly Copilot[], query: string): readonly Copilot[] {
  const words = query.trim().toLocaleLowerCase('ru').split(/\s+/).filter(Boolean)
  return copilots.filter((copilot) => {
    const text = `${copilot.name} ${copilot.description} ${copilot.id}`.toLocaleLowerCase('ru')
    return words.every((word) => text.includes(word))
  })
}
