import { describe, expect, it } from 'vitest'
import { parseRuntimeConfig } from './config'
import { createMockCatalogRepository, mockCopilots } from './mock-catalog'

describe('Адаптер каталога', () => {
  it('подключает runtime-адрес и автоматически возвращает новые записи', async () => {
    const added = { ...mockCopilots[1]!, id: 'new-copilot', name: 'Новый помощник' }
    const repository = createMockCatalogRepository([...mockCopilots, added], async () => ({
      applications: { 'test-agent-alpha': 'https://example.test/app' },
    }))
    const catalog = await repository.list()
    expect(catalog).toHaveLength(mockCopilots.length + 1)
    expect(catalog[0]?.applicationUrl).toBe('https://example.test/app')
    expect(catalog.at(-1)?.id).toBe('new-copilot')
    expect(mockCopilots[0]?.applicationUrl).toBeNull()
  })

  it('не блокирует каталог при отсутствии адреса отдельного приложения', async () => {
    const repository = createMockCatalogRepository(mockCopilots, async () => ({ applications: {} }))
    expect((await repository.list())[0]?.applicationUrl).toBeNull()
  })

  it('отклоняет некорректную конфигурацию и опасные протоколы', () => {
    for (const value of [
      null,
      {},
      { applications: null },
      { applications: [] },
      { applications: { app: 'javascript:alert(1)' } },
    ]) {
      expect(() => parseRuntimeConfig(value)).toThrow()
    }
  })
})
