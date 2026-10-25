import { describe, expect, it } from 'vitest'
import { testCopilots } from '../../tests/fixtures'
import { buildSignalNodes, SIGNAL_NODE_LIMIT } from './signal-layout'

const available = Array.from({ length: 36 }, (_, index) => ({
  ...testCopilots[2]!,
  id: `signal-${index + 1}`,
  name: `Помощник ${index + 1}`,
  status: 'available' as const,
}))

describe('обзор Signal', () => {
  it('показывает последние пять записей API и работает при 0, 1, 2, 5, 6, 36 элементах', () => {
    for (const count of [0, 1, 2, 5, 6, 36]) {
      const items = available.slice(0, count)
      const nodes = buildSignalNodes(items)
      expect(nodes.map((node) => node.copilot.id)).toEqual(
        items.slice(-SIGNAL_NODE_LIMIT).map((item) => item.id),
      )
      expect(nodes).toHaveLength(Math.min(SIGNAL_NODE_LIMIT, count))
      for (const node of nodes) {
        expect(items).toContain(node.copilot)
        expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true)
      }
    }
  })
  it('добавляет выбранного вне пятёрки в последний слот, не переставляя каталог', () => {
    const original = [...available]
    const nodes = buildSignalNodes(available, available[0]!.id)
    expect(nodes.map((node) => node.copilot.id)).toEqual(
      [...available.slice(-5, -1), available[0]!].map((item) => item.id),
    )
    expect(nodes).toHaveLength(SIGNAL_NODE_LIMIT)
    expect(available).toEqual(original)
  })
  it('сохраняет порядок последней пятёрки при выборе видимого или удалённого инструмента', () => {
    const expected = buildSignalNodes(available)
    expect(buildSignalNodes(available, available.at(-2)!.id)).toEqual(expected)
    expect(buildSignalNodes(available, 'removed')).toEqual(expected)
  })
})
