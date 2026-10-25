import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
})

test('hero appearance and preserved layout', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || /WebGL:/.test(message.text())) errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.evaluate(() => document.fonts.ready)
  if (!process.env.CLASSIC_BASELINE)
    await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await page.waitForTimeout(1200)
  const directory = resolve(
    '../.artifacts/liquid-ribbon',
    process.env.CLASSIC_BASELINE ? 'before' : 'after',
  )
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: resolve(directory, `${info.project.name}.png`) })
  await page.screenshot({
    path: resolve(directory, `${info.project.name}-full.png`),
    fullPage: true,
  })
  const layout = await page.evaluate(() =>
    Object.fromEntries(
      ['#hero-title', '.hero-description', '.search-form', '#catalog-title'].map((selector) => {
        const box = document.querySelector(selector)!.getBoundingClientRect()
        return [selector, { x: box.x, y: box.y, width: box.width, height: box.height }]
      }),
    ),
  )
  await writeFile(
    resolve(directory, `${info.project.name}-layout.json`),
    JSON.stringify(layout, null, 2),
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(
    await page.evaluate(
      () =>
        document.fonts.check('16px "MTS Text"') && document.fonts.check('500 32px "MTS Extended"'),
    ),
  ).toBe(true)
  expect(errors).toEqual([])
})
