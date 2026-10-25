import type { Copilot } from '../domain/copilot'

export const SIGNAL_NODE_LIMIT = 5

export interface SignalNode {
  copilot: Copilot
  x: number
  y: number
}

/** Последние записи в порядке API; выбранный вне пятёрки занимает последний слот. */
export function buildSignalNodes(
  available: readonly Copilot[],
  selectedId: string | null = null,
): SignalNode[] {
  const visible = available.slice(-SIGNAL_NODE_LIMIT)
  const selected = available.find((item) => item.id === selectedId)
  if (selected && !visible.some((item) => item.id === selectedId))
    visible[visible.length - 1] = selected
  return visible.map((copilot, index, items) => {
    const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2
    return {
      copilot,
      x: 200 + Math.cos(angle) * 140,
      y: 138 + Math.sin(angle) * 86,
    }
  })
}
