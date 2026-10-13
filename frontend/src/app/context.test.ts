import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlatformServices } from './context'
import { testCopilots } from '../../tests/fixtures'
import { createChatGateway } from '../services/chat'

afterEach(() => vi.useRealTimers())

describe('Обновление каталога', () => {
  it('каждые 30 секунд отражает добавления, удаления и статусы; прекращает polling', async () => {
    vi.useFakeTimers()
    const list = vi.fn().mockResolvedValue(testCopilots)
    const services = createPlatformServices({ list }, createChatGateway())
    services.startCatalogPolling()
    services.startCatalogPolling()
    await services.loadCatalog()
    expect(list).toHaveBeenCalledTimes(1)
    const updated = { ...testCopilots[0]!, status: 'unavailable' as const }
    list.mockResolvedValue([updated, { ...testCopilots[2]!, id: 'new' }])
    await vi.advanceTimersByTimeAsync(30000)
    expect(services.copilots.value.map((item) => item.id)).toEqual(['embedded-test', 'new'])
    expect(services.copilots.value[0]?.status).toBe('unavailable')
    expect(services.loading.value).toBe(false)
    services.stopCatalogPolling()
    await vi.advanceTimersByTimeAsync(60000)
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('сохраняет последний каталог при ошибке и принимает пустой каталог после восстановления', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(testCopilots)
      .mockRejectedValueOnce(new Error('API'))
      .mockResolvedValueOnce([])
    const services = createPlatformServices({ list }, createChatGateway())
    await services.loadCatalog()
    await services.loadCatalog()
    expect(services.copilots.value).toEqual(testCopilots)
    expect(services.hasLoaded.value).toBe(true)
    expect(services.error.value).toContain('Не удалось обновить')
    await services.loadCatalog()
    expect(services.copilots.value).toEqual([])
    expect(services.error.value).toBe('')
  })

  it('отмена загрузки при остановке не обновляет состояние', async () => {
    let resolve: ((items: typeof testCopilots) => void) | undefined
    const list = vi.fn(
      () =>
        new Promise<typeof testCopilots>((done) => {
          resolve = done
        }),
    )
    const services = createPlatformServices({ list }, createChatGateway())
    services.startCatalogPolling()
    const pending = services.loadCatalog()
    services.stopCatalogPolling()
    resolve?.(testCopilots)
    await pending
    expect(services.hasLoaded.value).toBe(false)
    expect(services.error.value).toBe('')
  })
})
