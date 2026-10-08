import { describe, expect, it } from 'vitest'
import { searchCopilots } from './copilot'
import { mockCopilots } from '../services/mock-catalog'

describe('Поиск Copilot', () => {
  it('учитывает регистр, пробелы, название, описание и идентификатор', () => {
    expect(searchCopilots(mockCopilots, '  TEST-agent-ALPHA ')).toHaveLength(1)
    expect(searchCopilots(mockCopilots, 'анализа результатов')[0]?.id).toBe('architecture-copilot')
    expect(searchCopilots(mockCopilots, '  ')).toHaveLength(mockCopilots.length)
    expect(searchCopilots(mockCopilots, 'несуществующий помощник')).toHaveLength(0)
  })
})
