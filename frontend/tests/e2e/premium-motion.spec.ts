import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

test('motion review: entrance, ribbon, search, card press, chat and embedded UI', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== '1440x900', 'Desktop motion recording')
  const directory = resolve('../.artifacts/classic-premium/motion')
  await mkdir(directory, { recursive: true })
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) =>
    route.fulfill({ json: [apiCopilots[0], apiCopilots[2]] }),
  )
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({ json: { state: 'ready' } }),
  )
  await page.route('https://copilot.test/ui/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="ru"><meta charset="utf-8"><style>body{font:16px/1.6 system-ui,sans-serif;color:#202027;background:#fafafa;padding:32px}h1{font-size:24px;font-weight:600}</style><h1>Тестовый интерфейс Copilot</h1><p>Проверка загрузки встроенного приложения.</p></html>',
    }),
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const recording = await context.newCDPSession(page)
  const frames: { name: string; timestamp: number }[] = []
  const writes: Promise<void>[] = []
  recording.on('Page.screencastFrame', (frame) => {
    const name = `frame-${String(frames.length).padStart(5, '0')}.jpg`
    frames.push({ name, timestamp: frame.metadata.timestamp ?? Date.now() / 1000 })
    writes.push(writeFile(resolve(directory, name), Buffer.from(frame.data, 'base64')))
    void recording.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
  })
  await recording.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 1440,
    maxHeight: 900,
    everyNthFrame: 2,
  })
  await page.goto('/')
  await page.screenshot({ path: resolve(directory, '01-entrance.png') })
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await page.waitForTimeout(650)
  await page.screenshot({ path: resolve(directory, '02-ribbon-a.png') })
  const firstFrame = await page.locator('.ribbon-stage').screenshot()
  await page.mouse.move(1150, 200, { steps: 20 })
  await page.waitForTimeout(800)
  const secondFrame = await page.locator('.ribbon-stage').screenshot()
  expect(firstFrame.equals(secondFrame)).toBe(false)
  await page.screenshot({ path: resolve(directory, '03-ribbon-b.png') })
  await page.getByRole('searchbox').focus()
  await page.waitForTimeout(250)
  await page.screenshot({ path: resolve(directory, '04-search-focus.png') })
  await page.getByRole('searchbox').pressSequentially('результатов', { delay: 80 })
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.waitForTimeout(400)
  await page.screenshot({ path: resolve(directory, '05-search-results.png') })
  await page.getByRole('searchbox').press('Escape')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await page.waitForTimeout(600)
  const card = page.locator('.copilot-card').filter({ hasText: 'Чат-сервис' })
  const link = card.getByRole('link', { name: 'Открыть Чат-сервис', exact: true })
  await link.hover()
  await page.waitForTimeout(300)
  expect(await card.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none')
  await page.screenshot({ path: resolve(directory, '06-card-hover.png') })
  await page.mouse.down()
  await page.waitForTimeout(150)
  await page.screenshot({ path: resolve(directory, '07-card-press.png') })
  await page.mouse.up()
  await expect(page.getByRole('textbox', { name: 'Сообщение Copilot' })).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Сообщение Copilot' })
    .fill('Помоги составить план работы.')
  await page.getByRole('button', { name: 'Отправить сообщение' }).click()
  await expect(page.locator('.message-assistant')).toContainText('Ответ сервиса')
  await page.screenshot({ path: resolve(directory, '08-chat.png') })
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  await page.getByRole('link', { name: 'Открыть Встроенный сервис', exact: true }).click()
  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: 'Тестовый интерфейс Copilot' }),
  ).toBeVisible()
  await page.screenshot({ path: resolve(directory, '09-embedded.png') })
  await page.waitForTimeout(800)
  expect(errors).toEqual([])
  await recording.send('Page.stopScreencast')
  await Promise.all(writes)
  const concat = ['ffconcat version 1.0']
  frames.forEach((frame, index) => {
    const next = frames[index + 1]
    concat.push(
      `file '${frame.name}'`,
      `duration ${next ? Math.max(0.001, next.timestamp - frame.timestamp).toFixed(6) : '0.1'}`,
    )
  })
  concat.push(`file '${frames.at(-1)!.name}'`)
  await writeFile(resolve(directory, 'frames.ffconcat'), concat.join('\n'))
  expect(frames.length).toBeGreaterThan(30)
})
