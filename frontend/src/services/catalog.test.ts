import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCatalogRepository, parseCatalog } from './catalog'
import { apiCopilots } from '../../tests/fixtures'

afterEach(() => vi.unstubAllGlobals())

describe('API каталога', () => {
  it('получает весь каталог через HTTP и поддерживает три интерфейса', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(apiCopilots)))
    vi.stubGlobal('fetch', fetch)
    const items = await createCatalogRepository().list()
    expect(items).toHaveLength(6)
    expect(items[0]?.interfaceType).toBe('embedded')
    expect(items[1]?.interfaceType).toBe('external')
    expect(items[2]?.interfaceType).toBe('chat')
    expect(fetch).toHaveBeenCalledWith(
      '/api/copilots',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('сохраняет ошибку конфигурации зарегистрированного приложения', () => {
    const items = parseCatalog([
      {
        ...apiCopilots[0],
        status: 'configuration-error',
        interface: null,
        configuration_error: 'Нет interface.type',
      },
    ])
    expect(items[0]?.interfaceType).toBeNull()
  })

  it.each([undefined, '', 'unknown', 42])('не превращает некорректный тип %s в chat', (type) => {
    expect(() => parseCatalog([{ ...apiCopilots[0], interface: { type } }])).toThrow()
  })

  it('отклоняет дубликаты, опасные адреса и некорректную структуру', () => {
    for (const data of [
      null,
      {},
      [apiCopilots[0], apiCopilots[0]],
      [{ ...apiCopilots[0], interface: { type: 'external', url: 'javascript:alert(1)' } }],
    ]) {
      expect(() => parseCatalog(data)).toThrow()
    }
  })

  it('передаёт ошибку недоступности API вызывающему коду', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    await expect(createCatalogRepository().list()).rejects.toThrow('API каталога недоступен')
  })
})
