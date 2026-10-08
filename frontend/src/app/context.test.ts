import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlatformServices } from './context'
import { mockCopilots } from '../../tests/fixtures'
import { createMockChatGateway } from '../services/mock-chat'

afterEach(() => vi.useRealTimers())

describe('Обновление каталога', () => {
  it('каждые 30 секунд отражает добавления, удаления и статусы; прекращает polling', async () => {
    vi.useFakeTimers()
    const list = vi.fn().mockResolvedValue(mockCopilots)
    const services = createPlatformServices({ list }, createMockChatGateway())
    services.startCatalogPolling()
    services.startCatalogPolling()
    await services.loadCatalog()
    expect(list).toHaveBeenCalledTimes(1)
    const updated = { ...mockCopilots[0]!, status: 'unavailable' as const }
    list.mockResolvedValue([updated, { ...mockCopilots[2]!, id: 'new' }])
    await vi.advanceTimersByTimeAsync(30000)
    expect(services.copilots.value.map((item) => item.id)).toEqual(['test-agent-alpha', 'new'])
    expect(services.copilots.value[0]?.status).toBe('unavailable')
    expect(services.loading.value).toBe(false)
    services.stopCatalogPolling()
    await vi.advanceTimersByTimeAsync(60000)
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('сохраняет последний каталог при ошибке и принимает пустой каталог после восстановления', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(mockCopilots)
      .mockRejectedValueOnce(new Error('API'))
      .mockResolvedValueOnce([])
    const services = createPlatformServices({ list }, createMockChatGateway())
    await services.loadCatalog()
    await services.loadCatalog()
    expect(services.copilots.value).toEqual(mockCopilots)
    expect(services.hasLoaded.value).toBe(true)
    expect(services.error.value).toContain('Не удалось обновить')
    await services.loadCatalog()
    expect(services.copilots.value).toEqual([])
    expect(services.error.value).toBe('')
  })

  it('отмена загрузки при остановке не обновляет состояние', async () => {
    let resolve: ((items: typeof mockCopilots) => void) | undefined
    const list = vi.fn(
      () =>
        new Promise<typeof mockCopilots>((done) => {
          resolve = done
        }),
    )
    const services = createPlatformServices({ list }, createMockChatGateway())
    services.startCatalogPolling()
    const pending = services.loadCatalog()
    services.stopCatalogPolling()
    resolve?.(mockCopilots)
    await pending
    expect(services.hasLoaded.value).toBe(false)
    expect(services.error.value).toBe('')
  })
})
