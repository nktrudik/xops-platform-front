import { describe, expect, it } from 'vitest'
import { freshApplicationUrl } from './embedding'

describe('Обновление адреса встроенного приложения', () => {
  it('сохраняет путь, параметры и якорь и меняет метку каждой загрузки', () => {
    const original = 'https://example.test/app?theme=light&view=chat#conversation'
    const first = new URL(freshApplicationUrl(original))
    const second = new URL(freshApplicationUrl(original))
    expect(first.origin).toBe('https://example.test')
    expect(first.pathname).toBe('/app')
    expect(first.searchParams.get('theme')).toBe('light')
    expect(first.searchParams.get('view')).toBe('chat')
    expect(first.hash).toBe('#conversation')
    expect(first.searchParams.get('_xops_reload')).toBeTruthy()
    expect(second.searchParams.get('_xops_reload')).not.toBe(first.searchParams.get('_xops_reload'))
  })

  it('заменяет существующую метку без накопления параметров', () => {
    const refreshed = new URL(freshApplicationUrl('https://example.test/app?_xops_reload=old'))
    expect(refreshed.searchParams.getAll('_xops_reload')).toHaveLength(1)
    expect(refreshed.searchParams.get('_xops_reload')).not.toBe('old')
  })
})
