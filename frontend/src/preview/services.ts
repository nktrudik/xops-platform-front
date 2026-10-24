import { createPlatformServices } from '../app/context'
import type { ChatGateway, Conversation, Copilot, StoredMessage } from '../domain/copilot'

/** Только локальный UI: модуль исключается из production условием import.meta.env.DEV. */
const copilots: readonly Copilot[] = [
  {
    id: 'figma-design',
    name: 'Figma Design Copilot',
    description:
      'Проверка макетов Figma на соответствие дизайн-системе. Найдите расхождения до передачи в разработку.',
    icon: 'layers',
    status: 'available',
    interfaceType: 'embedded',
    applicationUrl: 'https://preview.invalid/figma',
  },
  {
    id: 'ab-test',
    name: 'AB-test Copilot',
    description:
      'Анализ результатов A/B-экспериментов. От данных и статистики — к обоснованным продуктовым решениям.',
    icon: 'chart',
    status: 'available',
    interfaceType: 'chat',
    applicationUrl: null,
  },
  {
    id: 'sales',
    name: 'Sales Copilot',
    description:
      'Подготовка к встречам, работа с возражениями и создание предложений для ваших клиентов.',
    icon: 'compass',
    status: 'available',
    interfaceType: 'chat',
    applicationUrl: null,
  },
  {
    id: 'techmasters',
    name: 'Techmasters Copilot',
    description:
      'Автоматизация назначения технических интервью. Подберите интервьюера и согласуйте удобное время.',
    icon: 'code',
    status: 'available',
    interfaceType: 'embedded',
    applicationUrl: 'https://preview.invalid/techmasters',
  },
  {
    id: 'jarvis',
    name: 'Джарвис',
    description: 'Разложит сложную задачу по полочкам. Кофе пока не варит, но уже близок.',
    icon: 'sparkles',
    status: 'available',
    interfaceType: 'chat',
    applicationUrl: null,
  },
  {
    id: 'code-review',
    name: 'Code Review Copilot',
    description:
      'Помощник для проверки кода и поиска потенциальных проблем. Скоро в каталоге платформы.',
    icon: 'document',
    status: 'coming-soon',
    interfaceType: 'external',
    applicationUrl: 'https://preview.invalid/code-review',
  },
]

export function createPreviewServices() {
  const dialogs = new Map<string, Conversation[]>()
  const messages = new Map<string, StoredMessage[]>()
  let sequence = 0
  const chat: ChatGateway = {
    async list(id) {
      return { conversations: structuredClone(dialogs.get(id) ?? []), next_before: null }
    },
    async create(id) {
      const now = new Date().toISOString()
      const conversation = {
        id: crypto.randomUUID(),
        title: 'Новый диалог',
        created_at: now,
        updated_at: now,
      }
      dialogs.set(id, [conversation, ...(dialogs.get(id) ?? [])])
      messages.set(conversation.id, [])
      return structuredClone(conversation)
    },
    async remove(id, conversation) {
      dialogs.set(
        id,
        (dialogs.get(id) ?? []).filter((item) => item.id !== conversation),
      )
      messages.delete(conversation)
    },
    async messages(_id, conversation) {
      return { messages: structuredClone(messages.get(conversation) ?? []), next_before: null }
    },
    async send(id, conversation, requestId, content) {
      const history = messages.get(conversation) ?? []
      if (history.some((item) => item.request_id === requestId)) return
      for (const role of ['user', 'assistant'] as const)
        history.push({
          id: String(++sequence),
          request_id: requestId,
          role,
          content:
            role === 'user'
              ? content
              : 'Это **локальный тест UI**.\n\nЗдесь можно проверить:\n- оформление Markdown;\n- историю и удаление диалогов;\n- адаптивный интерфейс.\n\nЗапросы к модели и backend не отправляются.',
          status: 'complete',
          error: null,
          created_at: new Date().toISOString(),
        })
      messages.set(conversation, history)
      const dialog = dialogs.get(id)?.find((item) => item.id === conversation)
      if (dialog) {
        dialog.title = content.slice(0, 80)
        dialog.updated_at = new Date().toISOString()
      }
    },
  }
  return createPlatformServices({ list: async () => copilots }, chat, async () => ({
    state: 'unavailable' as const,
    reason:
      'Локальный тест UI: встроенное приложение не подключено. Каталог и тестовые чаты доступны без backend.',
  }))
}
