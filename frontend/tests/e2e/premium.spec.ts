import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) =>
    route.fulfill({ json: [apiCopilots[0], apiCopilots[2]] }),
  )
})

test('snapshot: two API copilots, fonts, overflow and frame cadence', async ({ page }, info) => {
  const errors: string[] = []
  const fontResponses: { url: string; status: number }[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('WebGL:')) errors.push(message.text())
  })
  page.on('response', (response) => {
    if (response.url().endsWith('.woff2'))
      fontResponses.push({ url: response.url(), status: response.status() })
  })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  for (const [family, weight] of [
    ['MTS Text', 400],
    ['MTS Text', 500],
    ['MTS Text', 700],
    ['MTS Extended', 500],
    ['MTS Extended', 700],
  ] as const) {
    expect(
      await page.evaluate(
        async ({ name, weight }) => {
          await document.fonts.load(`${weight} 24px "${name}"`)
          return [...document.fonts].some(
            (font) =>
              font.family === name && font.weight === String(weight) && font.status === 'loaded',
          )
        },
        { name: family, weight },
      ),
    ).toBe(true)
  }
  await page.waitForTimeout(800)
  const output = resolve(
    '../.artifacts/classic-premium',
    process.env.STUDIO_BEFORE ? 'before' : 'after',
  )
  await mkdir(output, { recursive: true })
  await page.screenshot({ path: resolve(output, `${info.project.name}.png`) })
  await page.screenshot({ path: resolve(output, `${info.project.name}-full.png`), fullPage: true })
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector('.hero')!.getBoundingClientRect()
    const card = document.querySelector('.copilot-card')!.getBoundingClientRect()
    return {
      hero: { height: hero.height, top: hero.top, bottom: hero.bottom },
      card: { top: card.top, width: card.width, height: card.height },
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }
  })
  const cadence = await page.evaluate(
    () =>
      new Promise<{ p95: number; fps: number }>((done) => {
        const samples: number[] = []
        let previous = 0
        function frame(now: number) {
          if (previous) samples.push(now - previous)
          previous = now
          if (samples.length < 90) requestAnimationFrame(frame)
          else {
            const sorted = [...samples].sort((a, b) => a - b)
            done({ p95: sorted[85]!, fps: 90000 / samples.reduce((a, b) => a + b, 0) })
          }
        }
        requestAnimationFrame(frame)
      }),
  )
  await writeFile(
    resolve(output, `${info.project.name}.json`),
    JSON.stringify({ geometry, cadence, fontResponses, errors }, null, 2),
  )
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  if (!process.env.STUDIO_BEFORE && geometry.viewportWidth >= 1024) {
    expect(geometry.hero.height).toBeGreaterThanOrEqual(350)
    expect(geometry.hero.height).toBeLessThanOrEqual(390)
  }
  if (!process.env.STUDIO_BEFORE && info.project.name === '1440x900') {
    expect(geometry.card.top + geometry.card.height).toBeLessThanOrEqual(900)
  }
  expect(fontResponses.filter((font) => font.status === 200)).toHaveLength(5)
  expect(fontResponses.some((font) => font.url.includes('MTSText') && font.status === 200)).toBe(
    true,
  )
  expect(
    fontResponses.some((font) => font.url.includes('MTSExtended') && font.status === 200),
  ).toBe(true)
  expect(errors).toEqual([])
})
