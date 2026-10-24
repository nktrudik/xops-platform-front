import { expect, it } from 'vitest'
import { createPreviewServices } from './services'

it('хранит тестовые диалоги только в памяти и не дублирует повторную отправку', async () => {
  const services = createPreviewServices()
  await services.loadCatalog()
  expect(services.copilots.value).toHaveLength(6)
  const signal = new AbortController().signal
  const dialog = await services.chat.create('ab-test', signal)
  await services.chat.send('ab-test', dialog.id, 'request', 'Вопрос', signal)
  await services.chat.send('ab-test', dialog.id, 'request', 'Вопрос', signal)
  const page = await services.chat.messages('ab-test', dialog.id, null, signal)
  expect(page.messages).toHaveLength(2)
  expect(page.messages[1]?.content).toContain('локальный тест UI')
  const fresh = createPreviewServices()
  expect((await fresh.chat.list('ab-test', null, signal)).conversations).toEqual([])
  await services.chat.remove('ab-test', dialog.id, signal)
  expect((await services.chat.list('ab-test', null, signal)).conversations).toEqual([])
})
