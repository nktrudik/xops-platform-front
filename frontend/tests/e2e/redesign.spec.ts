import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { visualCatalog as catalog } from '../visual-fixture'
import { installHistoryApi } from '../history-fixture'

const output = resolve('../.artifacts/ui-redesign-v2')

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: catalog }))
})

test('реальное приложение: главная, каталог, чат и Embedded UI', async ({ page }, testInfo) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  await mkdir(output, { recursive: true })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(catalog.length)
  if (testInfo.project.name === 'mobile')
    await expect(page.locator('.desktop-sidebar')).not.toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: resolve(output, `home-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
  await page.screenshot({
    path: resolve(output, `home-${testInfo.project.name}-viewport.png`),
    animations: 'disabled',
  })
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { name: 'Каталог Copilot', exact: true })).toBeVisible()
  await page.screenshot({
    path: resolve(output, `catalog-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: /^Чат/ }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(3)
  await page.getByRole('checkbox', { name: 'Только доступные' }).check()
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await expect(page).toHaveURL(/interface=chat/)
  await page.reload()
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Показать списком' }).click()
  await expect(page.locator('.catalog-grid')).toHaveClass(/catalog-list/)
  await page.getByRole('link', { name: 'Открыть AB-test Copilot', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Сообщение Copilot' })
    .fill('Помоги разобрать эксперимент')
  await page.getByRole('button', { name: 'Отправить сообщение' }).click()
  await expect(page.locator('.message-assistant')).toContainText('Ответ сервиса')
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.screenshot({
    path: resolve(output, `chat-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  await expect(page.locator('.copilot-card')).toHaveCount(catalog.length)
  await page.getByRole('link', { name: 'Открыть AB-test Copilot', exact: true }).click()
  await expect(page.locator('.message-user')).toContainText('Помоги разобрать эксперимент')
  await page.getByRole('button', { name: 'Удалить диалог «Новый диалог»' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить диалог', exact: true })
    .click()
  await expect(page.locator('.message-user')).toHaveCount(0)
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({ json: { state: 'ready' } }),
  )
  await page.route('https://copilot.test/ui/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<html lang="ru"><body style="font:16px Arial;padding:32px;color:#202329"><h1>Интерфейс Copilot</h1><p>Приложение загружено внутри платформы.</p></body></html>',
    }),
  )
  await page.getByRole('link', { name: 'Открыть Figma Design Copilot', exact: true }).click()
  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: 'Интерфейс Copilot' }),
  ).toBeVisible()
  await page.screenshot({
    path: resolve(output, `embedded-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(failures).toEqual([])
})

test('вход, выход, справка и мобильная навигация', async ({ page }, testInfo) => {
  let authorized = false
  const user = { id: 1, username: 'admin', role: 'admin', csrf_token: 'test-csrf' }
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: authorized ? 200 : 401,
      json: authorized ? user : { detail: 'Требуется авторизация' },
    }),
  )
  await page.route('**/api/auth/login', (route) => {
    authorized = true
    return route.fulfill({ json: user })
  })
  await page.route('**/api/auth/logout', (route) => {
    authorized = false
    return route.fulfill({ status: 204 })
  })
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { name: 'Вход в платформу' })).toBeVisible()
  await mkdir(output, { recursive: true })
  await page.screenshot({
    path: resolve(output, `login-${testInfo.project.name}.png`),
    fullPage: true,
  })
  await page.getByLabel('Пароль').fill('integration-test-password')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(catalog.length)
  await page.getByRole('button', { name: 'О платформе', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Ваши помощники для рабочих задач' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Ваши помощники для рабочих задач' }),
  ).not.toBeVisible()
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    const menu = page.getByRole('dialog', { name: 'Меню платформы' })
    await expect(menu).toBeVisible()
    await page.screenshot({
      path: resolve(output, 'navigation-mobile.png'),
      animations: 'disabled',
    })
    await menu.getByRole('link', { name: /Универсальный чат/ }).click()
    await expect(menu).not.toBeVisible()
    await expect(page).toHaveURL(/interface=chat/)
  }
  await page.getByRole('button', { name: 'Аккаунт: admin' }).click()
  await page.getByRole('button', { name: 'Выйти', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Аккаунт: admin' })).toBeFocused()
  await page.getByRole('button', { name: 'Аккаунт: admin' }).click()
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Вход в платформу' })).toBeVisible()
})

test('каталог работает с пустым и большим ответом API', async ({ page }) => {
  await page.route('**/api/copilots', (route) => route.fulfill({ json: [] }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'В каталоге пока нет Copilot' })).toBeVisible()
  const many = Array.from({ length: 80 }, (_, index) => ({
    ...catalog[index % catalog.length]!,
    id: `copilot-${index}`,
    display_name: `Помощник команды ${index + 1} — анализ сложных рабочих процессов`,
  }))
  await page.route('**/api/copilots', (route) => route.fulfill({ json: many }))
  await page.getByRole('button', { name: 'Обновить каталог' }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(80)
  await page.locator('.copilot-card').last().scrollIntoViewIfNeeded()
  await expect(page.locator('.copilot-card').last().getByRole('heading')).toBeVisible()
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Переполнение при ширине ${width}px`,
    ).toBe(true)
  }
})
