import { expect, test } from '@playwright/test'
import { apiCopilots, type CatalogEntry } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

function catalog(count: number): CatalogEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    ...apiCopilots[2]!,
    id: `tool-${index + 1}`,
    display_name: `Инструмент ${index + 1}`,
    status: 'available',
  }))
}

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
})

test('Signal: не больше пяти последних записей на орбите при любом размере каталога', async ({
  page,
}) => {
  for (const count of [0, 1, 2, 5, 6, 30, 100]) {
    const entries = catalog(count)
    await page.route('**/api/copilots', (route) => route.fulfill({ json: entries }))
    await page.goto('/')
    await expect(page.locator('.copilot-card')).toHaveCount(count)
    await expect(page.locator('.signal-node')).toHaveCount(Math.min(5, count))
    expect(
      await page
        .locator('.signal-node')
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.copilotId)),
    ).toEqual(entries.slice(-5).map((item) => item.id))
    await expect(page.locator('.inspector-navigation > span')).toHaveText(
      new RegExp(`/\\s*${String(count).padStart(2, '0')}$`),
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('Signal: весь каталог доступен в панели, а выбранный инструмент появляется на орбите', async ({
  page,
}) => {
  const entries = catalog(30)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: entries }))
  await page.goto('/')
  await expect(page.locator('.signal-node')).toHaveCount(5)
  await page.getByRole('button', { name: 'Следующий Copilot в Signal' }).focus()
  for (let index = 0; index < entries.length; index++) {
    await page.keyboard.press('Enter')
    await expect(page.locator('.signal-info:not([aria-hidden]) .inspector-title')).toHaveText(
      entries[index]!.display_name,
    )
    await expect(page.locator('.signal-node.node-active')).toHaveAttribute(
      'data-copilot-id',
      entries[index]!.id,
    )
    await expect(page.locator('.signal-node')).toHaveCount(5)
  }
  await page.keyboard.press('Enter')
  await expect(page.locator('.signal-info:not([aria-hidden]) .inspector-title')).toHaveText(
    entries[0]!.display_name,
  )
  await page.getByRole('button', { name: 'Предыдущий Copilot в Signal' }).click()
  await expect(page.locator('.signal-info:not([aria-hidden]) .inspector-title')).toHaveText(
    entries.at(-1)!.display_name,
  )
})

test('Signal: статусы, удаление, поиск и обновление поступают из API', async ({
  page,
}, testInfo) => {
  let entries = catalog(8)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: entries }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Следующий Copilot в Signal' }).click()
  await expect(page.locator('.signal-node.node-active')).toHaveAttribute(
    'data-copilot-id',
    'tool-1',
  )
  entries = entries.map((item) =>
    item.id === 'tool-1' ? { ...item, status: 'unavailable' } : item,
  )
  await page.getByRole('button', { name: 'Обновить каталог' }).click()
  await expect(page.locator('.inspector-unavailable')).toHaveText('Недоступен')
  await expect(page.locator('.inspector-open')).toHaveCount(0)
  await expect(page.locator('.signal-node[data-copilot-id="tool-1"]')).toHaveCount(0)
  await page.getByRole('searchbox').fill('Инструмент 1')
  await expect(page.locator('.inspector-navigation > span')).toHaveText(/01\s*\/\s*01/)
  await expect(page.locator('.signal-node')).toHaveCount(0)
  entries = entries.filter((item) => item.id !== 'tool-1')
  await page.getByRole('button', { name: 'Обновить каталог' }).click()
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible()
  await expect(page.locator('.signal-info')).toHaveCount(0)
  await page.getByRole('button', { name: 'Очистить поиск', exact: true }).first().click()
  const next = page.getByRole('button', { name: 'Следующий Copilot в Signal' })
  if (testInfo.project.name === 'mobile') await next.tap()
  else await next.click()
  await expect(page.locator('.signal-info:not([aria-hidden]) .inspector-title')).toHaveText(
    'Инструмент 2',
  )
  await page
    .getByRole('link', { name: 'Открыть выбранный Copilot: Инструмент 2', exact: true })
    .click()
  await expect(page).toHaveURL(/\/copilots\/tool-2$/)
  await expect(page.getByRole('textbox', { name: 'Сообщение Copilot' })).toBeVisible()
})

test('Вход обязателен, каталог не запрашивается до авторизации', async ({ page }) => {
  let catalogRequests = 0
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Требуется авторизация' } }),
  )
  await page.route('**/api/copilots', (route) => {
    catalogRequests++
    return route.fulfill({ json: catalog(8) })
  })
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { name: 'Вход в платформу' })).toBeVisible()
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByText('Локальный просмотр', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Control+k')
  await expect(
    page.getByRole('dialog', { name: 'Быстрый поиск Copilot', exact: true }),
  ).not.toBeVisible()
  expect(catalogRequests).toBe(0)
})
