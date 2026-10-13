import { describe, expect, it } from 'vitest'
import { searchCopilots } from './copilot'
import { testCopilots } from '../../tests/fixtures'

describe('Поиск Copilot', () => {
  it('учитывает регистр, пробелы, название, описание и идентификатор', () => {
    expect(searchCopilots(testCopilots, '  EMBEDDED-test ')).toHaveLength(1)
    expect(searchCopilots(testCopilots, 'анализа результатов')[0]?.id).toBe('chat-test')
    expect(searchCopilots(testCopilots, '  ')).toHaveLength(testCopilots.length)
    expect(searchCopilots(testCopilots, 'несуществующий помощник')).toHaveLength(0)
  })
})
