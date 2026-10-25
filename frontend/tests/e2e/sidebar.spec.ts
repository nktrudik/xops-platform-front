import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

const output = resolve('../.artifacts/sidebar-responsive')

async function expectLayout(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
  const sidebar = page.locator('.app-sidebar:visible')
  const dimensions = await sidebar.evaluate((element) => {
    const nav = element.querySelector<HTMLElement>('.sidebar-nav')!
    element.scrollLeft = 100
    element.scrollTop = 100
    return {
      navWidth: nav.clientWidth,
      navContentWidth: nav.scrollWidth,
      height: element.clientHeight,
      contentHeight: element.scrollHeight,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    }
  })
  expect(dimensions.navContentWidth).toBeLessThanOrEqual(dimensions.navWidth)
  expect(dimensions.contentHeight).toBeLessThanOrEqual(dimensions.height)
  expect(dimensions.scrollLeft).toBe(0)
  expect(dimensions.scrollTop).toBe(0)
}

async function expectKeyboardNavigation(page: Page): Promise<void> {
  const links = page.locator('.app-sidebar:visible .sidebar-link')
  await expect(links).toHaveCount(5)
  await links.first().focus()
  for (let index = 0; index < 5; index++) {
    const link = links.nth(index)
    await expect(link).toBeFocused()
    expect(
      await link.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const nav = element.closest('nav')!.getBoundingClientRect()
        return (
          rect.top >= nav.top - 1 &&
          rect.bottom <= nav.bottom + 1 &&
          rect.left >= nav.left &&
          rect.right <= nav.right + 1
        )
      }),
    ).toBe(true)
    if (index < 4) await page.keyboard.press('Tab')
  }
}

async function sampleTransition(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const failures = new Set<string>()
        const start = performance.now()
        function sample() {
          const nav = document.querySelector<HTMLElement>('.desktop-sidebar .sidebar-nav')!
          if (nav.scrollWidth > nav.clientWidth)
            failures.add(`nav ${nav.scrollWidth} > ${nav.clientWidth}`)
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth)
            failures.add('page overflow')
          if (performance.now() - start < 400) requestAnimationFrame(sample)
          else resolve([...failures])
        }
        requestAnimationFrame(sample)
      }),
  )
}
test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) =>
    route.fulfill({ json: [apiCopilots[0], apiCopilots[2]] }),
  )
})

test('sidebar geometry and screenshot', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await page.evaluate(() => document.fonts.ready)
  if (info.project.name === '390x844')
    await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.waitForTimeout(450)
  const directory = resolve(output, process.env.SIDEBAR_BASELINE ? 'before' : 'after')
  await mkdir(directory, { recursive: true })
  await page.screenshot({
    path: resolve(directory, `${info.project.name}.png`),
    animations: 'disabled',
  })
  const geometry = await page.evaluate(() => {
    const sidebar = [...document.querySelectorAll<HTMLElement>('.app-sidebar')].find(
      (element) => element.getBoundingClientRect().width > 0,
    )!
    function measure(element: HTMLElement) {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
      }
    }
    return {
      page: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth },
      sidebar: measure(sidebar),
      elements: [...sidebar.children].map((child) => ({
        class: child.className,
        ...measure(child as HTMLElement),
      })),
      overflowing: [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          return (
            rect.width > 0 &&
            rect.right > innerWidth + 1 &&
            getComputedStyle(element).position !== 'absolute'
          )
        })
        .slice(0, 12)
        .map((element) => ({ class: element.className, ...measure(element) })),
    }
  })
  await writeFile(
    resolve(directory, `${info.project.name}.json`),
    JSON.stringify(geometry, null, 2),
  )
  await expectLayout(page)
  await expectKeyboardNavigation(page)
  expect(errors).toEqual([])
})

test('navigation works expanded, collapsed and throughout the width animation', async ({
  page,
}, info) => {
  await page.goto('/catalog')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  const mobile = info.project.name === '390x844'
  if (mobile) await page.getByRole('button', { name: 'Открыть меню' }).click()
  else {
    for (const name of ['Свернуть навигацию', 'Развернуть навигацию']) {
      const samples = sampleTransition(page)
      await page.getByRole('button', { name, exact: true }).click()
      expect(await samples).toEqual([])
      await expectLayout(page)
      await expectKeyboardNavigation(page)
    }
  }
  for (const [label, suffix] of [
    ['Главная', '/'],
    ['Каталог Copilot', '/catalog'],
    ['Универсальный чат', '/catalog?interface=chat'],
    ['Встроенные приложения', '/catalog?interface=embedded'],
    ['Внешние продукты', '/catalog?interface=external'],
  ]) {
    await page
      .locator('.app-sidebar:visible')
      .getByRole('link', { name: label, exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`${suffix!.replace('?', '\\?')}$`))
    if (mobile) {
      await expect(page.getByRole('dialog', { name: 'Меню платформы' })).not.toBeVisible()
      await page.getByRole('button', { name: 'Открыть меню' }).click()
    }
    await expectLayout(page)
  }
  if (mobile) {
    await page.getByRole('button', { name: 'Закрыть меню' }).click()
    await expect(page.getByRole('dialog', { name: 'Меню платформы' })).not.toBeVisible()
  }
})

test('short viewport scrolls navigation only and retains every item', async ({ page }, info) => {
  await page.setViewportSize({ width: info.project.use.viewport!.width, height: 400 })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  if (info.project.name === '390x844')
    await page.getByRole('button', { name: 'Открыть меню' }).click()
  const sidebar = page.locator('.app-sidebar:visible')
  await expect(sidebar.locator('.sidebar-footer')).not.toBeVisible()
  await page.addStyleTag({
    content: '.sidebar-nav::-webkit-scrollbar { width: 16px; height: 16px; }',
  })
  expect(
    await sidebar
      .locator('nav')
      .evaluate((element) => element.getBoundingClientRect().width - element.clientWidth),
  ).toBe(16)
  expect(
    await sidebar.locator('nav').evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true)
  await expectKeyboardNavigation(page)
  expect(await sidebar.locator('nav').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expectLayout(page)
  for (const selector of ['.sidebar-brand', '.workspace-label', '.sidebar-signature']) {
    const box = (await sidebar.locator(selector).boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(400)
  }
  if (info.project.name !== '390x844') {
    await page.getByRole('button', { name: 'Свернуть навигацию' }).click()
    await expect(sidebar).toHaveCSS('width', '80px')
    await expectKeyboardNavigation(page)
    await expectLayout(page)
  }
})
