import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

interface AuditResult {
  violations: { id: string; help: string; nodes: { target: string[]; failureSummary: string }[] }[]
  incomplete: unknown[]
}

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
})

test('keyboard navigation has visible focus and accessible controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Перейти к содержимому' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await page.keyboard.press('/')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await expect(page.locator('.search-form')).toHaveCSS('border-color', 'rgb(227, 6, 17)')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Найти', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Приостановить анимацию' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.motion-toggle')).toHaveAttribute('aria-pressed', 'true')
  let reachedCard = false
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab')
    if (await page.locator('.card-open:focus').count()) {
      reachedCard = true
      break
    }
  }
  expect(reachedCard).toBe(true)
  const focused = page.locator('.copilot-card:has(.card-open:focus)')
  expect(await focused.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/copilots\/embedded-test$/)
})

test('WCAG scan of catalog and search empty state', async ({ page }, info) => {
  const axeSource = process.env.AXE_SOURCE
  test.skip(
    !axeSource,
    'Set AXE_SOURCE to a local axe-core browser bundle for an independent accessibility audit',
  )
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.getByRole('button', { name: 'Приостановить анимацию' }).click()
  await page.evaluate(() => document.fonts.ready)
  await page.addScriptTag({ path: resolve(axeSource!) })
  const directory = resolve('../.artifacts/classic-premium/accessibility')
  await mkdir(directory, { recursive: true })
  for (const state of ['catalog', 'no-results']) {
    if (state === 'no-results') {
      await page.getByRole('searchbox').fill('несуществующий помощник')
      await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible()
    }
    await page.waitForTimeout(600)
    const result = await page.evaluate(async () => {
      const engine = (
        window as unknown as {
          axe: {
            run: (
              context: Document,
              options: { runOnly: { type: string; values: string[] } },
            ) => Promise<AuditResult>
          }
        }
      ).axe
      return engine.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      })
    })
    await writeFile(
      resolve(directory, `${info.project.name}-${state}.json`),
      JSON.stringify(result, null, 2),
    )
    expect(result.violations).toEqual([])
  }
})
