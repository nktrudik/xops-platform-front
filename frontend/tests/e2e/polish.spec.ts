import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { installHistoryApi } from '../history-fixture'
import { visualCatalog } from '../visual-fixture'

const output = resolve('../.artifacts/xops-signal-polish')

async function geometry(page: Page): Promise<number[]> {
  return page.locator('.catalog-hero').evaluate((hero) => {
    const origin = hero.getBoundingClientRect()
    const result = [origin.width, origin.height]
    const inspector = hero.querySelector('.signal-inspector')!.getBoundingClientRect()
    const map = hero.querySelector('.signal-map')!.getBoundingClientRect()
    const overlap = (a: DOMRect, b: DOMRect): boolean =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    if (overlap(inspector, map)) throw new Error('Панель пересекает орбиты')
    for (const node of hero.querySelectorAll('.signal-node-icon, .signal-node-label')) {
      if (overlap(inspector, node.getBoundingClientRect()))
        throw new Error('Панель пересекает узел или подпись')
    }
    for (const rect of [inspector, map])
      result.push(rect.left - origin.left, rect.top - origin.top, rect.width, rect.height)
    return result
  })
}

async function stable(page: Page, reference: number[]): Promise<void> {
  const actual = await geometry(page)
  for (let index = 0; index < reference.length; index++)
    expect(Math.abs(actual[index]! - reference[index]!)).toBeLessThan(1)
}

async function ready(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(visualCatalog.length)
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.catalog-workspace')).toHaveCSS('transform', 'none')
}

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: visualCatalog }))
})

test('Polish: каждый узел, отдельная панель и стабильная геометрия во время смены', async ({
  page,
}, testInfo) => {
  await ready(page)
  const reference = await geometry(page)
  const items = visualCatalog.filter((item) => item.status === 'available')
  const links = page.locator('.signal-node')
  await expect(links).toHaveCount(items.length)
  for (let index = 0; index < items.length; index++) {
    const link = links.nth(index)
    if (testInfo.project.name === 'mobile') await link.focus()
    else await link.hover()
    await expect(link).toHaveClass(/node-active/)
    await stable(page, reference)
    await page.waitForTimeout(90)
    await stable(page, reference)
    await expect(
      page.getByRole('link', {
        name: `Открыть выбранный Copilot: ${items[index]!.display_name}`,
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.locator('.signal-connection')).toHaveCSS('visibility', 'visible')
    expect(
      await page
        .locator('.signal-flow')
        .evaluate((path) => (path as SVGPathElement).getTotalLength()),
    ).toBeGreaterThan(0)
    await expect(page.locator('.signal-node.node-muted')).toHaveCount(items.length - 1)
    await stable(page, reference)
  }
  await links.first().focus()
  for (let index = 0; index < items.length; index++) {
    await expect(links.nth(index)).toBeFocused()
    await expect(links.nth(index)).toHaveClass(/node-active/)
    if (index < items.length - 1) await page.keyboard.press('Tab')
  }
  await page.keyboard.press('ArrowRight')
  await expect(links.first()).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(links.last()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.node-active')).toHaveCount(0)
  await expect(page.locator('.signal-connection')).toHaveCount(0)
  await expect(page.locator('.inspector-placeholder')).toBeVisible()
  await stable(page, reference)
  await links.first().focus()
  await page.getByRole('button', { name: 'Сбросить выбор Copilot' }).click()
  await expect(page.getByRole('button', { name: 'Следующий Copilot в Signal' })).toBeFocused()
  await expect(page.locator('.node-active')).toHaveCount(0)
})

test('Polish: touch и переключение информации с открытием настоящего чата', async ({
  page,
}, testInfo) => {
  await ready(page)
  const next = page.getByRole('button', { name: 'Следующий Copilot в Signal' })
  const previous = page.getByRole('button', { name: 'Предыдущий Copilot в Signal' })
  for (const control of [next, next, previous, next]) {
    if (testInfo.project.name === 'mobile') await control.tap()
    else await control.click()
  }
  const selected = page.getByRole('link', {
    name: 'Открыть выбранный Copilot: AB-test Copilot',
    exact: true,
  })
  await expect(selected).toBeVisible()
  await selected.click()
  await expect(page).toHaveURL(/\/copilots\/chat-test$/)
  await page
    .getByRole('textbox', { name: 'Сообщение Copilot' })
    .fill('Проверка после выбора в Signal')
  await page.getByRole('button', { name: 'Отправить сообщение' }).click()
  await expect(page.locator('.message-assistant')).toContainText('Ответ сервиса')
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  const node = page.getByRole('link', { name: 'Открыть на карте: AB-test Copilot', exact: true })
  if (testInfo.project.name === 'mobile') await node.tap()
  else await node.click()
  await expect(page.locator('.message-user')).toContainText('Проверка после выбора в Signal')
})

test('Polish: 0, 1, 6, 36 Copilot, поиск вне первого экрана и отсутствие перекрытий', async ({
  page,
}, testInfo) => {
  for (const count of [0, 1, 6, 36]) {
    const items = Array.from({ length: count }, (_, index) => ({
      ...visualCatalog[index % visualCatalog.length]!,
      id: `polish-${index + 1}`,
      display_name: `Copilot ${index + 1}`,
      status: 'available',
    }))
    await page.route('**/api/copilots', (route) => route.fulfill({ json: items }))
    await page.goto('/')
    await expect(page.locator('.copilot-card')).toHaveCount(count)
    await expect(page.locator('.signal-node')).toHaveCount(Math.min(5, count))
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.catalog-workspace')).toHaveCSS('transform', 'none')
    await geometry(page)
    if (!count)
      await expect(page.getByRole('button', { name: 'Следующий Copilot в Signal' })).toBeDisabled()
    else {
      await page.getByRole('button', { name: 'Следующий Copilot в Signal' }).click()
      await expect(page.locator('.signal-connection')).toHaveCSS('visibility', 'visible')
      await geometry(page)
    }
    if (count === 36) {
      await page.getByRole('searchbox').fill('Copilot 30')
      await expect(page.locator('.copilot-card')).toHaveCount(1)
      await expect(page.locator('.signal-node.node-match')).toHaveCount(1)
      await expect(page.locator('.signal-node')).toHaveCount(1)
      await expect(
        page.getByRole('link', { name: 'Открыть на карте: Copilot 30', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Открыть выбранный Copilot: Copilot 30', exact: true }),
      ).toBeVisible()
      await geometry(page)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const directory = resolve(output, 'counts')
    await mkdir(directory, { recursive: true })
    await page.screenshot({
      path: resolve(directory, `${count}-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
    if (count === 36) {
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Обновить каталог' }).click()
      await expect(page.locator('.node-active')).toHaveCount(0)
    }
  }
})

test('Polish: пауза фонового движения, reduced motion и уход со страницы', async ({ page }) => {
  await ready(page)
  const aura = page.locator('.signal-core-aura')
  await page.getByRole('button', { name: 'Приостановить анимацию Signal' }).click()
  await expect(aura).toHaveCSS('animation-play-state', 'paused')
  await page.getByRole('button', { name: 'Возобновить анимацию Signal' }).click()
  await expect(aura).toHaveCSS('animation-play-state', 'running')
  const longCatalog = Array.from({ length: 36 }, (_, index) => ({
    ...visualCatalog[index % visualCatalog.length]!,
    id: `motion-${index}`,
  }))
  await page.route('**/api/copilots', (route) => route.fulfill({ json: longCatalog }))
  await page.getByRole('button', { name: 'Обновить каталог' }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(36)
  await page.locator('.copilot-card').last().scrollIntoViewIfNeeded()
  await expect(aura).toHaveCSS('animation-play-state', 'paused')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(aura).toHaveCSS('animation-play-state', 'running')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(aura).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.signal-motion')).not.toBeVisible()
  await page.locator('.signal-node').first().focus()
  await expect(page.locator('.signal-flow')).toHaveCSS('animation-name', 'none')
  await page.keyboard.press('Escape')
  await expect(page.locator('.signal-connection')).toHaveCount(0)
})

test('Polish: кадры естественных анимаций Signal, фильтрации и карточек', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Последовательность кадров снимается на desktop.')
  const directory = resolve(output, 'motion')
  await mkdir(directory, { recursive: true })
  await ready(page)
  const frame = async (name: string): Promise<void> => {
    await page.screenshot({ path: resolve(directory, name) })
  }
  await frame('01-workspace.png')
  const nodes = page.locator('.signal-node')
  await nodes.first().hover()
  await page.waitForTimeout(90)
  await frame('02-first-node-enter.png')
  await page.waitForTimeout(260)
  await frame('03-first-node-active.png')
  await nodes.nth(1).hover()
  await page.waitForTimeout(80)
  await frame('04-switching-node.png')
  await page.waitForTimeout(240)
  await frame('05-second-node-active.png')
  await page.keyboard.press('Escape')
  await page.getByRole('searchbox').fill('встречам')
  await page.waitForTimeout(90)
  await frame('06-search-in-motion.png')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.waitForTimeout(380)
  await frame('07-search-result.png')
  await page.getByRole('button', { name: 'Очистить поиск', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(6)
  await page.getByRole('button', { name: /^Чат/ }).click()
  await page.waitForTimeout(100)
  await frame('08-filter-in-motion.png')
  await expect(page.locator('.copilot-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'Показать списком' }).click()
  await page.waitForTimeout(420)
  await frame('09-list.png')
  await page.getByRole('button', { name: 'Показать карточками' }).click()
  await page.waitForTimeout(420)
  const card = page.locator('.copilot-card').first()
  await card.hover()
  await page.waitForTimeout(130)
  await frame('10-card-hover-enter.png')
  await page.waitForTimeout(260)
  await frame('11-card-hover-active.png')
  await card.screenshot({ path: resolve(directory, '12-card-detail.png') })
})

test('Polish: снимки для визуального сравнения', async ({ page }, testInfo) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('[Vue warn]'))
      failures.push(message.text())
  })
  const directory = resolve(output, process.env.SIGNAL_SHOT_PHASE === 'before' ? 'before' : 'after')
  await mkdir(directory, { recursive: true })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(visualCatalog.length)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: resolve(directory, `home-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
  await page.screenshot({
    path: resolve(directory, `home-${testInfo.project.name}-viewport.png`),
    animations: 'disabled',
  })
  await page.getByRole('link', { name: 'Открыть на карте: AB-test Copilot', exact: true }).focus()
  await expect(page.locator('.signal-info')).toContainText('AB-test Copilot')
  await expect(page.locator('.signal-info')).toHaveCSS('opacity', '1')
  await page.screenshot({
    path: resolve(directory, `signal-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  await page.locator('.catalog-hero').screenshot({
    path: resolve(directory, `signal-hero-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  expect(failures).toEqual([])
})
