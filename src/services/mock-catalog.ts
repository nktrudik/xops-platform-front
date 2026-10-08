import type { Copilot, CatalogRepository } from '../domain/copilot'
import { loadRuntimeConfig } from './config'

/** Демонстрационные записи: статусы заданы вручную, SSO и backend отсутствуют. */
export const mockCopilots: readonly Copilot[] = [
  {
    id: 'test-agent-alpha',
    name: 'Test Agent Alpha',
    description:
      'Тестовый AI Copilot с собственным интерфейсом. Работайте с приложением прямо на платформе.',
    interfaceType: 'iframe',
    applicationKey: 'test-agent-alpha',
    applicationUrl: null,
    status: 'available',
    icon: 'sparkles',
  },
  {
    id: 'development-copilot',
    name: 'Figma designe Copilot',
    description: 'Сервис для проверки соответствия файлов критериям дизайнеров.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'available',
    icon: 'code',
  },
  {
    id: 'architecture-copilot',
    name: 'AB-test Copilot',
    description: 'Сервис для анализа результатов A/B-экспериментов.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'available',
    icon: 'layers',
  },
  {
    id: 'documentation-copilot',
    name: 'Sales Copilot',
    description: 'Ваш помощник по продажам.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'available',
    icon: 'document',
  },
  {
    id: 'analytics-copilot',
    name: 'Techmasters Copilot',
    description: 'Сервис автоматизации назначения технических интервью в МТС.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'maintenance',
    icon: 'chart',
  },
  {
    id: 'research-copilot',
    name: 'Джарвис',
    description: 'Ваш личный Джарвис. Железный костюм пока в разработке.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'coming-soon',
    icon: 'compass',
  },
]

/** Замена этого адаптера не требует изменения страниц или маршрутов. */
export function createMockCatalogRepository(
  entries: readonly Copilot[] = mockCopilots,
  getConfig = loadRuntimeConfig,
): CatalogRepository {
  return {
    async list(signal) {
      const config = await getConfig(signal)
      return entries.map((copilot) =>
        copilot.interfaceType === 'iframe'
          ? { ...copilot, applicationUrl: config.applications[copilot.applicationKey] ?? null }
          : { ...copilot },
      )
    },
  }
}
