import { expect, test } from '@playwright/test'
import { apiCopilots, type CatalogEntry } from '../fixtures'

test('polling отражает появление, удаление и недоступность без перезагрузки', async ({ page }) => {
  await page.clock.install()
  let items: CatalogEntry[] = structuredClone(apiCopilots)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: items }))
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  items = [
    { ...apiCopilots[0]!, status: 'unavailable' },
    { ...apiCopilots[2]!, id: 'new-copilot', display_name: 'Новый Copilot' },
  ]
  await page.clock.fastForward(30000)
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Открыть Новый Copilot', exact: true })).toBeVisible()
  const offline = page.locator('.copilot-card').filter({ hasText: 'Test Agent Alpha' })
  await expect(offline.locator('.status-badge')).toHaveText('Недоступен')
  await expect(offline.getByRole('link')).toHaveCount(0)
  items = []
  await page.clock.fastForward(30000)
  await expect(page.getByRole('heading', { name: 'В каталоге пока нет Copilot' })).toBeVisible()
})

test('обновление и ошибка API сохраняют открытый mock-чат и его сообщения', async ({ page }) => {
  await page.clock.install()
  let unavailable = false
  await page.route('**/api/copilots', (route) =>
    unavailable
      ? route.fulfill({ status: 503, json: { detail: 'Недоступен' } })
      : route.fulfill({ json: apiCopilots }),
  )
  await page.goto('/copilots/architecture-copilot')
  await page.getByRole('textbox', { name: 'Сообщение Copilot' }).fill('Сохрани сообщение')
  await page.getByRole('button', { name: 'Отправить сообщение' }).click()
  await page.clock.fastForward(1000)
  await expect(page.locator('.message-assistant')).toHaveCount(1)
  await page.clock.fastForward(30000)
  await expect(page.locator('.message-user')).toContainText('Сохрани сообщение')
  unavailable = true
  await page.clock.fastForward(30000)
  await expect(page.getByText(/Показаны последние полученные данные/)).toBeVisible()
  await expect(page.locator('.message-user')).toContainText('Сохрани сообщение')
  unavailable = false
  await page.getByRole('button', { name: 'Повторить попытку', exact: true }).click()
  await expect(page.locator('.catalog-notice')).toHaveCount(0)
  await expect(page.locator('.message-user')).toHaveCount(1)
})

test('external открывает информационную страницу и сохраняет навигацию', async ({ page }) => {
  await page.goto('/copilots/development-copilot')
  await expect(page.getByRole('heading', { name: 'Внешний продукт' })).toBeVisible()
  const link = page.getByRole('link', { name: 'Перейти к продукту' })
  await expect(link).toHaveAttribute('href', 'https://example.com')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(page.getByRole('link', { name: 'XOps Platform — главная' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('ошибка метаданных остаётся карточкой и не становится чатом', async ({ page }) => {
  await page.route('**/api/copilots', (route) =>
    route.fulfill({
      json: [
        {
          ...apiCopilots[0],
          status: 'configuration-error',
          interface: null,
          configuration_error: 'Не настроен interface.type в copilot.yaml.',
        },
      ],
    }),
  )
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await expect(page.locator('.status-badge')).toHaveText('Ошибка конфигурации')
  await page.getByRole('link', { name: 'Открыть Test Agent Alpha', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Интерфейс Copilot не настроен' })).toBeVisible()
  await expect(page.getByText('Не настроен interface.type в copilot.yaml.')).toBeVisible()
  await expect(page.locator('textarea')).toHaveCount(0)
})

test('недоступный embedded показывает ошибку и повтор возвращает UI', async ({ page }) => {
  let ready = false
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({
      json: ready ? { state: 'ready' } : { state: 'unavailable', reason: 'Приложение недоступно.' },
    }),
  )
  await page.route('http://2.59.80.61/dev/test-agent-alpha/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<h1>Сервис восстановлен</h1>',
    }),
  )
  await page.goto('/copilots/test-agent-alpha')
  await expect(page.getByText('Приложение недоступно.', { exact: true })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  ready = true
  await page.getByRole('button', { name: 'Повторить попытку', exact: true }).click()
  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: 'Сервис восстановлен' }),
  ).toBeVisible()
})
