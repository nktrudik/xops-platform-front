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
    name: 'Помощник разработчика',
    description: 'Обсудите код, подход к реализации и технические вопросы с AI-помощником.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'available',
    icon: 'code',
  },
  {
    id: 'architecture-copilot',
    name: 'Архитектурный помощник',
    description: 'Разберите архитектурные решения, зависимости и структуру ваших приложений.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'available',
    icon: 'layers',
  },
  {
    id: 'documentation-copilot',
    name: 'Помощник по документации',
    description: 'Сформулируйте требования, подготовьте структуру документа и упорядочьте знания.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'available',
    icon: 'document',
  },
  {
    id: 'analytics-copilot',
    name: 'Аналитический помощник',
    description:
      'Исследуйте данные и сформулируйте вопросы для анализа. Copilot временно на обслуживании.',
    interfaceType: 'chat',
    applicationUrl: null,
    status: 'maintenance',
    icon: 'chart',
  },
  {
    id: 'research-copilot',
    name: 'Помощник исследователя',
    description: 'Исследуйте идеи и подходы к решению задач. Приложение готовится к запуску.',
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
