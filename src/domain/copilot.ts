export type CopilotStatus = 'available' | 'maintenance' | 'coming-soon'
export type CopilotIcon = 'sparkles' | 'code' | 'layers' | 'document' | 'chart' | 'compass'

interface CopilotBase {
  id: string
  name: string
  description: string
  status: CopilotStatus
  icon: CopilotIcon
}

/** Внутренняя модель платформы; будущий контракт backend пока не определён. */
export type Copilot = CopilotBase &
  (
    | { interfaceType: 'iframe'; applicationKey: string; applicationUrl: string | null }
    | { interfaceType: 'chat'; applicationUrl: null }
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
}

export function searchCopilots(copilots: readonly Copilot[], query: string): readonly Copilot[] {
  const words = query.trim().toLocaleLowerCase('ru').split(/\s+/).filter(Boolean)
  return copilots.filter((copilot) => {
    const text = `${copilot.name} ${copilot.description} ${copilot.id}`.toLocaleLowerCase('ru')
    return words.every((word) => text.includes(word))
  })
}
