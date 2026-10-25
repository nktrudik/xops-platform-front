import { expect, test, type Page } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

declare global {
  interface Window {
    ribbonFrames: number
    ribbonDrawMs: number[]
  }
}

async function frames(page: Page): Promise<number> {
  return page.evaluate(() => window.ribbonFrames)
}

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
  await page.addInitScript(() => {
    window.ribbonFrames = 0
    window.ribbonDrawMs = []
    const draw = WebGLRenderingContext.prototype.drawElements
    WebGLRenderingContext.prototype.drawElements = function (...args) {
      const start = performance.now()
      draw.apply(this, args)
      window.ribbonDrawMs.push(performance.now() - start)
      window.ribbonFrames++
    }
  })
})

test('animation pauses, resumes, respects visibility and cleans up on navigation', async ({
  page,
}) => {
  await page.route('**/api/copilots', (route) =>
    route.fulfill({
      json: [
        ...apiCopilots,
        ...Array.from({ length: 24 }, (_, index) => ({ ...apiCopilots[0], id: `extra-${index}` })),
      ],
    }),
  )
  await page.goto('/')
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await expect.poll(() => frames(page)).toBeGreaterThan(3)
  await page.getByRole('button', { name: 'Приостановить анимацию' }).click()
  await page.waitForTimeout(100)
  const paused = await frames(page)
  await page.waitForTimeout(200)
  expect(await frames(page)).toBe(paused)
  await page.getByRole('button', { name: 'Включить анимацию' }).press('Enter')
  await expect.poll(() => frames(page)).toBeGreaterThan(paused + 2)

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(100)
  const hidden = await frames(page)
  await page.waitForTimeout(200)
  expect(await frames(page)).toBe(hidden)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => frames(page)).toBeGreaterThan(hidden + 2)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(350)
  const offscreen = await frames(page)
  await page.waitForTimeout(250)
  expect(await frames(page)).toBe(offscreen)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => frames(page)).toBeGreaterThan(offscreen + 2)

  await page.getByRole('link', { name: 'Открыть Чат-сервис', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Сообщение Copilot' })).toBeVisible()
  await expect(page.locator('.liquid-ribbon')).toHaveCount(0)
  await page.waitForTimeout(150)
  const unmounted = await frames(page)
  await page.waitForTimeout(200)
  expect(await frames(page)).toBe(unmounted)
  await page.getByRole('link', { name: 'Каталог Copilot', exact: true }).last().click()
  await expect.poll(() => frames(page)).toBeGreaterThan(unmounted + 2)
})

test('reduced motion is static and responds to a changed system preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'static')
  await expect(page.locator('.ribbon-fallback')).toBeVisible()
  await expect(page.locator('.motion-toggle')).toHaveCount(0)
  expect(await frames(page)).toBe(0)
  await page.getByRole('searchbox').fill('Внешний')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await expect.poll(() => frames(page)).toBeGreaterThan(2)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  const stopped = await frames(page)
  await page.waitForTimeout(200)
  expect(await frames(page)).toBe(stopped)
  await expect(page.locator('.ribbon-fallback')).toBeVisible()
})

test('unavailable WebGL keeps a useful static hero and search', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('.ribbon-fallback')).toBeVisible()
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'static')
  await page.getByRole('searchbox').fill('Внешний')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  expect(await frames(page)).toBe(0)
})

test('context loss falls back and restores without duplicate render loops', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => frames(page)).toBeGreaterThan(3)
  await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl')!
    const extension = gl.getExtension('WEBGL_lose_context')!
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 400)
  })
  await expect(page.locator('.ribbon-fallback')).toBeVisible()
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  const restored = await frames(page)
  await expect.poll(() => frames(page)).toBeGreaterThan(restored + 3)
})
