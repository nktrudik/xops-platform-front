import { expect, test } from '@playwright/test'

test('каталог, поиск, адаптивность и локальные шрифты', async ({ page }) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await expect(
    page.getByRole('link', { name: 'Открыть Test Agent Alpha', exact: true }),
  ).toBeVisible()
  await page.getByRole('searchbox', { name: 'Поиск Copilot' }).fill('Figma')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.getByRole('searchbox').fill('несуществующее приложение')
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible()
  await page.getByRole('button', { name: 'Очистить поиск', exact: true }).last().click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "MTS Text"'))).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(failures).toEqual([])
})

test('чат отправляет mock-ответ и сохраняет общую навигацию', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Открыть AB-test Copilot', exact: true }).click()
  await expect(page.getByText('Mock-режим', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Сообщение Copilot' }).fill('Как разбить задачу на шаги?')
  await page.getByRole('button', { name: 'Отправить сообщение' }).click()
  await expect(page.locator('.message-assistant')).toContainText('демонстрационный ответ')
  await expect(page.locator('.message-user')).toHaveCount(1)
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
})

test('удалённый UI отображается внутри платформы', async ({ page }) => {
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({ json: { state: 'ready' } }),
  )
  await page.route('http://2.59.80.61/dev/test-agent-alpha/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<html lang="ru"><body><h1>Тестовый интерфейс Copilot</h1></body></html>',
    }),
  )
  await page.goto('/copilots/test-agent-alpha')
  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: 'Тестовый интерфейс Copilot' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'XOps Platform — главная' })).toBeVisible()
  await expect(page.locator('.frame-loading')).toHaveCount(0)
})

test('повтор и обновление страницы загружают новую версию UI вместо сохранённого документа', async ({
  page,
}) => {
  const documents = new Map<string, string>()
  const requests: string[] = []
  let currentVersion = 'Версия 1'
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({ json: { state: 'ready' } }),
  )
  await page.route('http://2.59.80.61/dev/test-agent-alpha**', (route) => {
    const url = route.request().url()
    requests.push(url)
    const version = documents.get(url) ?? currentVersion
    documents.set(url, version)
    return route.fulfill({
      contentType: 'text/html; charset=utf-8',
      headers: { 'Cache-Control': 'public, max-age=86400' },
      body: `<html lang="ru"><body><h1>${version}</h1></body></html>`,
    })
  })
  await page.goto('/copilots/test-agent-alpha')
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Версия 1' })).toBeVisible()
  currentVersion = 'Версия 2'
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Версия 2' })).toBeVisible()
  currentVersion = 'Версия 3'
  await page.reload()
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Версия 3' })).toBeVisible()
  expect(new Set(requests).size).toBe(3)
  for (const request of requests) {
    expect(new URL(request).searchParams.get('_xops_reload')).toBeTruthy()
  }
})

test('запрет iframe, недоступный Copilot и неизвестный маршрут', async ({ page }) => {
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({
      json: { state: 'blocked', reason: 'Приложение запрещает встраивание (X-Frame-Options).' },
    }),
  )
  await page.goto('/copilots/test-agent-alpha')
  await expect(page.getByText('Приложение запрещает встраивание (X-Frame-Options).')).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  await page.goto('/copilots/analytics-copilot')
  await expect(page.getByRole('heading', { name: 'Copilot на обслуживании' })).toBeVisible()
  await page.goto('/copilots/unknown')
  await expect(page.getByRole('heading', { name: 'Copilot не найден' })).toBeVisible()
  await page.goto('/unknown')
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
})

test('ошибка API не ломает навигацию и позволяет повторить загрузку', async ({ page }) => {
  await page.route('**/api/copilots', (route) =>
    route.fulfill({ status: 500, json: { error: 'Сбой конфигурации' } }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Каталог недоступен' })).toBeVisible()
  await page.unroute('**/api/copilots')
  await page.getByRole('button', { name: 'Повторить попытку' }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
})
