import { describe, expect, it } from 'vitest'
import { testCopilots } from '../../tests/fixtures'
import { buildSignalNodes } from './signal-layout'

const available = Array.from({ length: 36 }, (_, index) => ({
  ...testCopilots[2]!,
  id: `signal-${index + 1}`,
  name: `Помощник ${index + 1}`,
  status: 'available' as const,
}))

describe('обзор Signal', () => {
  it('сохраняет реальные записи и конечные координаты при 0, 1, 6, 36 элементах', () => {
    for (const count of [0, 1, 6, 36]) {
      const items = available.slice(0, count)
      const nodes = buildSignalNodes(items, '')
      expect(nodes).toHaveLength(Math.min(6, count))
      for (const node of nodes) {
        expect(items).toContain(node.copilot)
        expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true)
      }
    }
  })
  it('выносит совпадение за пределами первых шести в схему, не переставляя каталог', () => {
    const original = [...available]
    const nodes = buildSignalNodes(available, 'Помощник 30')
    expect(nodes[0]?.copilot.id).toBe('signal-30')
    expect(nodes).toHaveLength(1)
    expect(available).toEqual(original)
  })
  it('использует поиск по всем словам и возвращает пустую схему при отсутствии совпадений', () => {
    expect(buildSignalNodes(available, '  Помощник   30 ')[0]?.copilot.id).toBe('signal-30')
    expect(buildSignalNodes(available, 'нет такого инструмента')).toHaveLength(0)
  })
})
