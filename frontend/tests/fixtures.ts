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
    id: 'test-agent-alpha',
    display_name: 'Test Agent Alpha',
    description: 'Тестовое приложение',
    status: 'available',
    icon: 'sparkles',
    interface: { type: 'embedded', url: 'http://2.59.80.61/dev/test-agent-alpha/' },
  },
  {
    id: 'development-copilot',
    display_name: 'Figma Design Copilot',
    description: 'Проверка файлов',
    status: 'available',
    icon: 'code',
    interface: { type: 'external', url: 'https://example.com' },
  },
  {
    id: 'architecture-copilot',
    display_name: 'AB-test Copilot',
    description: 'Сервис для анализа результатов A/B-экспериментов',
    status: 'available',
    icon: 'layers',
    interface: { type: 'chat' },
  },
  {
    id: 'documentation-copilot',
    display_name: 'Sales Copilot',
    description: 'Ваш помощник по продажам',
    status: 'available',
    icon: 'document',
    interface: { type: 'chat' },
  },
  {
    id: 'analytics-copilot',
    display_name: 'Techmasters Copilot',
    description: 'Технические интервью',
    status: 'maintenance',
    icon: 'chart',
    interface: { type: 'chat' },
  },
  {
    id: 'research-copilot',
    display_name: 'Джарвис',
    description: 'Железный костюм пока в разработке.',
    status: 'coming-soon',
    icon: 'compass',
    interface: { type: 'chat' },
  },
]

export const mockCopilots = parseCatalog(apiCopilots)
