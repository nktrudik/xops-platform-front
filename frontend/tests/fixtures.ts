import type { CopilotIcon, CopilotStatus } from '../src/domain/copilot'
import { parseCatalog } from '../src/services/catalog'

/** Данные исключительно для проверок HTTP-контракта и компонентов. */
export interface CatalogEntry {
  id: string
  display_name: string
  description: string
  status: CopilotStatus
  icon: CopilotIcon
  interface: { type: string; url?: string } | null
  configuration_error?: string
}

export const apiCopilots: CatalogEntry[] = [
  {
    id: 'embedded-test',
    display_name: 'Встроенный сервис',
    description: 'Тестовое приложение',
    status: 'available',
    icon: 'sparkles',
    interface: { type: 'embedded', url: 'https://copilot.test/ui/' },
  },
  {
    id: 'external-test',
    display_name: 'Внешний сервис',
    description: 'Проверка файлов',
    status: 'available',
    icon: 'code',
    interface: { type: 'external', url: 'https://example.com' },
  },
  {
    id: 'chat-test',
    display_name: 'Чат-сервис',
    description: 'Сервис для анализа результатов A/B-экспериментов',
    status: 'available',
    icon: 'layers',
    interface: { type: 'chat' },
  },
  {
    id: 'second-chat-test',
    display_name: 'Второй чат',
    description: 'Ваш помощник по продажам',
    status: 'available',
    icon: 'document',
    interface: { type: 'chat' },
  },
  {
    id: 'maintenance-test',
    display_name: 'Обслуживаемый сервис',
    description: 'Технические интервью',
    status: 'maintenance',
    icon: 'chart',
    interface: { type: 'chat' },
  },
  {
    id: 'upcoming-test',
    display_name: 'Ожидаемый сервис',
    description: 'Сервис ещё не запущен.',
    status: 'coming-soon',
    icon: 'compass',
    interface: { type: 'chat' },
  },
]

export const testCopilots = parseCatalog(apiCopilots)
