import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
})

for (const count of [0, 1, 2, 6, 12, 30]) {
  test(`dynamic catalog: ${count} entries`, async ({ page }, info) => {
    const entries = Array.from({ length: count }, (_, index) => ({
      ...apiCopilots[index % apiCopilots.length]!,
      id: `catalog-${index}`,
      display_name: `${apiCopilots[index % apiCopilots.length]!.display_name}${index >= 6 ? ` · ${index + 1}` : ''}`,
    }))
    await page.route('**/api/copilots', (route) => route.fulfill({ json: entries }))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('.copilot-card')).toHaveCount(count)
    if (!count)
      await expect(page.getByRole('heading', { name: 'В каталоге пока нет Copilot' })).toBeVisible()
    else await expect(page.locator('.catalog-count')).toHaveText(`${count} Copilot`)
    await page.evaluate(() => document.fonts.ready)
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      cards: [...document.querySelectorAll('.copilot-card')].map((element) => {
        const box = element.getBoundingClientRect()
        return { x: box.x, y: box.y, width: box.width, right: box.right }
      }),
    }))
    expect(layout.width).toBeLessThanOrEqual(layout.viewport)
    expect(layout.cards.every((box) => box.x >= 0 && box.right <= layout.viewport)).toBe(true)
    if (count === 1 && layout.viewport > 760)
      expect(layout.cards[0]!.width).toBeLessThanOrEqual(720)
    if (count === 2 && layout.viewport > 640) {
      expect(layout.cards[0]!.y).toBe(layout.cards[1]!.y)
      const grid = await page.locator('.catalog-grid').boundingBox()
      expect(layout.cards[1]!.right).toBeCloseTo(grid!.x + grid!.width, 0)
    }
    const directory = resolve('../.artifacts/classic-premium/states', info.project.name)
    await mkdir(directory, { recursive: true })
    await page.screenshot({
      path: resolve(directory, `catalog-${count}.png`),
      fullPage: count <= 6,
    })
  })
}

test('combined filters, URL restoration, keyboard and rapid input', async ({ page }) => {
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
  await page.goto('/?format=chat&q=продажам')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await expect(page.getByRole('searchbox')).toHaveValue('продажам')
  await expect(page.getByRole('button', { name: /^Чат/ })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.keyboard.press('/')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await page.getByRole('searchbox').fill('файлов')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.getByRole('searchbox').press('Escape')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.getByRole('button', { name: /^Встроенный UI/ }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.getByRole('searchbox').fill('не найдено')
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible()
  await page.locator('.catalog-state').getByRole('button', { name: 'Сбросить фильтры' }).click()
  for (const value of ['чат', 'внешний', '', 'сервис', ''])
    await page.getByRole('searchbox').fill(value)
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await expect(page.locator('.copilot-card[inert]')).toHaveCount(0)
  await page.getByRole('searchbox').fill('результатов')
  await page.getByRole('searchbox').press('Enter')
  await expect(page.locator('#catalog-title')).toBeFocused()
  await page.getByRole('link', { name: 'Открыть Чат-сервис', exact: true }).focus()
  await expect(page.getByRole('link', { name: 'Открыть Чат-сервис', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Сообщение Copilot' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('результатов')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
})

test('loading, API recovery and all availability states', async ({ page }, info) => {
  let release: (() => Promise<void>) | undefined
  await page.route('**/api/copilots', (route) => {
    release = () => route.fulfill({ json: apiCopilots })
  })
  await page.goto('/')
  await expect(page.locator('.catalog-skeletons')).toBeVisible()
  const directory = resolve('../.artifacts/classic-premium/states', info.project.name)
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: resolve(directory, 'loading.png'), fullPage: true })
  await release!()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  for (const name of ['Обслуживаемый сервис', 'Ожидаемый сервис']) {
    const card = page.locator('.copilot-card').filter({ hasText: name })
    await expect(card.getByRole('link')).toHaveCount(0)
  }
  let failure = true
  const statuses = [
    ...apiCopilots,
    {
      ...apiCopilots[0]!,
      id: 'offline',
      status: 'unavailable',
      display_name: 'Недоступный сервис',
    },
    {
      ...apiCopilots[0]!,
      id: 'invalid',
      status: 'configuration-error',
      interface: null,
      configuration_error: 'Не настроен интерфейс.',
      display_name: 'Требуется настройка',
    },
  ]
  await page.route('**/api/copilots', (route) =>
    failure
      ? route.fulfill({ status: 503, json: { detail: 'Unavailable' } })
      : route.fulfill({ json: statuses }),
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Каталог недоступен' })).toBeVisible()
  await page.screenshot({ path: resolve(directory, 'error.png'), fullPage: true })
  failure = false
  await page.getByRole('button', { name: 'Повторить попытку', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(8)
  await expect(
    page.locator('.copilot-card').filter({ hasText: 'Недоступный сервис' }).getByRole('link'),
  ).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Открыть Требуется настройка' })).toBeVisible()
  await page.screenshot({ path: resolve(directory, 'availability.png'), fullPage: true })
})

test('long API content and narrow viewports remain usable', async ({ page }) => {
  await page.route('**/api/copilots', (route) =>
    route.fulfill({
      json: [
        {
          ...apiCopilots[0]!,
          display_name: 'КорпоративныйПомощникДляОченьДлинногоНазванияБезПробелов'.repeat(2),
          description: 'Описание рабочей задачи с подробностями. '.repeat(12),
        },
      ],
    }),
  )
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('.copilot-card')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /^Открыть Корпоративный/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
