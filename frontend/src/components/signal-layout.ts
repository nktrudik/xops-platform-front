import { searchCopilots, type Copilot } from '../domain/copilot'

export interface SignalNode {
  copilot: Copilot
  x: number
  y: number
}

/** Координаты и приоритет поиска относятся только к обзору, порядок каталога не меняется. */
export function buildSignalNodes(available: readonly Copilot[], query: string): SignalNode[] {
  return searchCopilots(available, query)
    .slice(0, 6)
    .map((copilot, index, items) => {
      const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2
      return {
        copilot,
        x: 200 + Math.cos(angle) * 140,
        y: 138 + Math.sin(angle) * 86,
      }
    })
}
