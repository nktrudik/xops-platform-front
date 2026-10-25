import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

test('record ten seconds of actual hero interaction', async ({ page, context }, info) => {
  test.skip(
    process.env.CLASSIC_RECORD !== '1' || info.project.name !== '1440',
    'Opt-in visual recording',
  )
  test.setTimeout(45000)
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
  await page.goto('/')
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await page.evaluate(() => document.fonts.ready)
  // CDP omits the OS cursor. This marker follows real pointer events only in the recording.
  await page.evaluate(() => {
    const cursor = document.createElement('div')
    cursor.style.cssText =
      'position:fixed;left:-30px;top:-30px;width:12px;height:12px;border:2px solid white;border-radius:50%;background:#27232a;box-shadow:0 0 0 1px #27232a88;z-index:9999;pointer-events:none;'
    document.body.append(cursor)
    document.addEventListener('pointermove', (event) => {
      cursor.style.transform = `translate(${event.clientX + 24}px,${event.clientY + 24}px)`
    })
  })
  const directory = resolve('../.artifacts/liquid-ribbon/video')
  await mkdir(directory, { recursive: true })
  const session = await context.newCDPSession(page)
  const frames: { name: string; timestamp: number }[] = []
  const writes: Promise<void>[] = []
  session.on('Page.screencastFrame', (event) => {
    const name = `frame-${String(frames.length).padStart(5, '0')}.jpg`
    frames.push({ name, timestamp: event.metadata.timestamp ?? Date.now() / 1000 })
    writes.push(writeFile(resolve(directory, name), Buffer.from(event.data, 'base64')))
    void session.send('Page.screencastFrameAck', { sessionId: event.sessionId })
  })
  await session.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 1440,
    maxHeight: 900,
    everyNthFrame: 1,
  })
  const start = Date.now()
  async function until(milliseconds: number): Promise<void> {
    await page.waitForTimeout(Math.max(1, start + milliseconds - Date.now()))
  }
  await page.mouse.move(820, 560)
  await until(1800)
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2
    await page.mouse.move(1130 + Math.cos(angle) * 190, 295 + Math.sin(angle) * 110)
    await until(1800 + (i + 1) * 50)
  }
  await page.getByRole('searchbox').click()
  await page.getByRole('searchbox').pressSequentially('Внешний', { delay: 95 })
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await until(7500)
  await page.getByRole('button', { name: 'Очистить поиск', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.mouse.move(1250, 260, { steps: 30 })
  await until(10500)
  await session.send('Page.stopScreencast')
  await Promise.all(writes)
  const lines = ['ffconcat version 1.0']
  frames.forEach((frame, index) => {
    const next = frames[index + 1]
    lines.push(
      `file '${frame.name}'`,
      `duration ${next ? Math.max(0.001, next.timestamp - frame.timestamp).toFixed(6) : '0.05'}`,
    )
  })
  lines.push(`file '${frames.at(-1)!.name}'`)
  await writeFile(resolve(directory, 'frames.ffconcat'), lines.join('\n'))
  await writeFile(
    resolve(directory, 'capture.json'),
    JSON.stringify(
      {
        duration: 10.5,
        frames: frames.length,
        sequence: '0–1.8s idle; 1.8–4.8s cursor; 4.8–7.5s search; 7.5–10.5s clear and cursor',
        cursor: 'QA marker follows real pointer events',
      },
      null,
      2,
    ),
  )
  expect(frames.length).toBeGreaterThan(100)
})
