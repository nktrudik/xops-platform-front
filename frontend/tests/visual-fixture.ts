import { apiCopilots, type CatalogEntry } from './fixtures'

/** HTTP-фикстуры существуют только в браузерных тестах, основной frontend использует API. */
export const visualCatalog: CatalogEntry[] = [
  {
    ...apiCopilots[0]!,
    display_name: 'Figma Design Copilot',
    description:
      'Проверка макетов Figma на соответствие дизайн-системе. Найдите расхождения до передачи в разработку.',
  },
  {
    ...apiCopilots[2]!,
    display_name: 'AB-test Copilot',
    description:
      'Анализ результатов A/B-экспериментов. От данных и статистики — к обоснованным продуктовым решениям.',
  },
  {
    ...apiCopilots[3]!,
    display_name: 'Sales Copilot',
    description:
      'Подготовка к встречам, работа с возражениями и создание предложений для ваших клиентов.',
  },
  {
    ...apiCopilots[0]!,
    id: 'techmasters',
    display_name: 'Techmasters Copilot',
    icon: 'code',
    description:
      'Автоматизация назначения технических интервью. Подберите интервьюера и согласуйте удобное время.',
  },
  {
    ...apiCopilots[1]!,
    display_name: 'База знаний команды',
    icon: 'document',
    description:
      'Документация и накопленные знания вашей команды в едином внешнем рабочем инструменте.',
  },
  {
    ...apiCopilots[5]!,
    display_name: 'Code Review Copilot',
    icon: 'code',
    description:
      'Помощник для проверки кода и поиска потенциальных проблем. Скоро в каталоге платформы.',
  },
]
