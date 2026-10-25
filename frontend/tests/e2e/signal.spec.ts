import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { visualCatalog } from '../visual-fixture'
import { installHistoryApi } from '../history-fixture'

const output = resolve('../.artifacts/xops-signal')
async function capture(page: Page, name: string): Promise<void> {
  await mkdir(output, { recursive: true })
  await page.evaluate(async () => {
    await document.fonts.ready
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.screenshot({
    path: resolve(output, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
  await page.screenshot({ path: resolve(output, `${name}-viewport.png`), animations: 'disabled' })
}
test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: visualCatalog }))
})

test('Signal: шрифты, три разрешения, каталог → чат → Embedded', async ({ page }, testInfo) => {
  const failures: string[] = []
  const fonts: { url: string; status: number }[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[Vue warn]'))
      failures.push(message.text())
  })
  page.on('response', (response) => {
    if (response.url().endsWith('.woff2'))
      fonts.push({ url: response.url(), status: response.status() })
  })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 14px "MTS Text"'),
      document.fonts.load('500 24px "MTS Extended"'),
    ])
  })
  for (const family of ['MTS Text', 'MTS Extended']) {
    expect(
      await page.evaluate(
        (name) =>
          [...document.fonts].some((font) => font.family === name && font.status === 'loaded'),
        family,
      ),
    ).toBe(true)
  }
  expect(fonts.some((font) => font.url.includes('MTSText') && font.status === 200)).toBe(true)
  expect(fonts.some((font) => font.url.includes('MTSExtended') && font.status === 200)).toBe(true)
  if (testInfo.project.name !== 'mobile') {
    expect((await page.locator('.catalog-hero').boundingBox())!.height).toBeLessThanOrEqual(360)
    await expect(page.locator('.desktop-sidebar .sidebar-active-marker')).toHaveClass(
      /marker-visible/,
    )
  }
  await capture(page, `home-${testInfo.project.name}`)
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { name: 'Каталог Copilot', exact: true })).toBeVisible()
  await capture(page, `catalog-${testInfo.project.name}`)
  await page.getByRole('link', { name: 'Открыть AB-test Copilot', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Сообщение Copilot' })
    .fill('Помоги оценить результаты эксперимента')
  await page.getByRole('button', { name: 'Отправить сообщение' }).click()
  await expect(page.locator('.message-assistant')).toContainText('Ответ сервиса')
  await capture(page, `chat-${testInfo.project.name}`)
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.route('**/api/copilots/*/embedding-check', (route) =>
    route.fulfill({ json: { state: 'ready' } }),
  )
  await page.route('https://copilot.test/ui/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<html lang="ru"><body style="font:16px Arial;padding:32px;color:#202126"><h1>Интерфейс Copilot</h1><p>Тест встраивания приложения в рабочее пространство.</p></body></html>',
    }),
  )
  await page.getByRole('link', { name: 'Открыть Figma Design Copilot', exact: true }).click()
  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: 'Интерфейс Copilot' }),
  ).toBeVisible()
  await capture(page, `embedded-${testInfo.project.name}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(failures).toEqual([])
})

test('Signal: Command Palette с клавиатуры, маршруты и недоступные инструменты', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  const trigger = page.getByRole('button', { name: 'Открыть быстрый поиск' })
  await trigger.focus()
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Быстрый поиск Copilot', exact: true })
  const input = palette.getByRole('combobox')
  await expect(input).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(input).toHaveAttribute('aria-activedescendant', 'command-option-1')
  await input.fill('AB-test')
  await expect(palette.getByRole('option')).toHaveCount(1)
  await capture(page, `command-${testInfo.project.name}`)
  await input.press('Enter')
  await expect(palette).not.toBeVisible()
  await expect(page).toHaveURL(/copilots\/chat-test$/)
  await expect(page.getByRole('textbox', { name: 'Сообщение Copilot' })).toBeVisible()
  await trigger.click()
  await palette.getByRole('combobox').fill('Code Review')
  await expect(palette.getByRole('option')).toHaveAttribute('aria-disabled', 'true')
  await palette.getByRole('combobox').press('Enter')
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await palette.getByRole('combobox').fill('нет такого помощника')
  await expect(palette.getByRole('status')).toHaveText(/Ничего не найдено/)
  await page.keyboard.press('Escape')
})

test('Signal: hover, focus, сворачивание sidebar и кадры взаимодействий', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Кадры движения записываются на desktop; клавиатура проверяется на всех размерах.',
  )
  const motion = resolve(output, 'motion')
  await mkdir(motion, { recursive: true })
  await page.goto('/')
  await expect(page.locator('.signal-node')).toHaveCount(5)
  // Кадры снимают естественное движение, animations: disabled здесь не применяется.
  await page.screenshot({ path: resolve(motion, '01-hero-entry.png') })
  await page.waitForTimeout(180)
  await page.screenshot({ path: resolve(motion, '02-hero-entry.png') })
  await page.waitForTimeout(520)
  await page.screenshot({ path: resolve(motion, '03-hero-settled.png') })
  const node = page.getByRole('link', { name: 'Открыть на карте: AB-test Copilot', exact: true })
  await node.focus()
  await expect(page.locator('.signal-info')).toContainText('AB-test Copilot')
  await page.waitForTimeout(180)
  await page.screenshot({ path: resolve(motion, '04-node-focus.png') })
  await page.getByRole('searchbox').focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('.signal-info')).not.toBeVisible()
  const firstCard = page.locator('.copilot-card').first()
  await firstCard.hover()
  await page.waitForTimeout(260)
  expect(await firstCard.evaluate((el) => getComputedStyle(el, '::before').transform)).toBe(
    'matrix(1, 0, 0, 1, 0, 0)',
  )
  await page.screenshot({ path: resolve(motion, '05-card-hover.png') })
  await page.getByRole('searchbox').fill('встречам')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.screenshot({ path: resolve(motion, '06-search.png') })
  await page.getByRole('button', { name: 'Очистить поиск', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.getByRole('button', { name: /^Чат/ }).click()
  await page.waitForTimeout(90)
  await page.screenshot({ path: resolve(motion, '07-filter-moving.png') })
  await expect(page.locator('.copilot-card')).toHaveCount(3)
  await page.waitForTimeout(300)
  await page.screenshot({ path: resolve(motion, '08-filter-settled.png') })
  await page.getByRole('button', { name: 'Показать списком' }).click()
  await page.waitForTimeout(100)
  await page.screenshot({ path: resolve(motion, '09-grid-to-list.png') })
  await page.waitForTimeout(250)
  const collectionBox = (await page.locator('.catalog-grid').boundingBox())!
  const rowBox = (await page.locator('.copilot-card').first().boundingBox())!
  expect(Math.abs(rowBox.x - collectionBox.x)).toBeLessThan(1)
  expect(Math.abs(rowBox.width - collectionBox.width)).toBeLessThan(1)
  await expect(page.locator('.copilot-card').first()).toHaveCSS('display', 'grid')
  await page.screenshot({ path: resolve(motion, '09b-list-settled.png') })
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(230)
  await page.screenshot({ path: resolve(motion, '10-command-palette.png') })
  await page.keyboard.press('Escape')
  const sidebar = page.locator('.desktop-sidebar')
  await page.getByRole('button', { name: 'Свернуть навигацию' }).click()
  await page.waitForTimeout(280)
  expect((await sidebar.boundingBox())!.width).toBe(80)
  await page.screenshot({ path: resolve(motion, '11-sidebar-collapsed.png') })
  const marker = sidebar.locator('.sidebar-active-marker')
  const initial = await marker.getAttribute('style')
  await sidebar.getByRole('link', { name: 'Каталог Copilot', exact: true }).click()
  await expect(marker).not.toHaveAttribute('style', initial!)
  await page.getByRole('button', { name: 'Развернуть навигацию' }).click()
  await expect(sidebar).toHaveCSS('width', '248px')
})

test('Signal: 0, 1, 6, 30 Copilot и reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const count of [0, 1, 6, 30]) {
    const items = Array.from({ length: count }, (_, index) => ({
      ...visualCatalog[index % visualCatalog.length]!,
      id: `signal-${index}`,
      display_name: `Помощник ${index + 1} · ${visualCatalog[index % visualCatalog.length]!.display_name}`,
    }))
    await page.route('**/api/copilots', (route) => route.fulfill({ json: items }))
    await page.goto('/')
    await expect(page.locator('.copilot-card')).toHaveCount(count)
    await expect(page.locator('.signal-node')).toHaveCount(
      Math.min(6, items.filter((item) => item.status === 'available').length),
    )
    if (!count)
      await expect(page.getByRole('heading', { name: 'В каталоге пока нет Copilot' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      await page
        .locator('.signal-core-aura')
        .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThanOrEqual(0.001)
    await capture(page, `count-${count}-${testInfo.project.name}`)
  }
})
