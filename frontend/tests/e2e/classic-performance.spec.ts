import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

test('measure animation overhead and search responsiveness', async ({ page }, info) => {
  await page.addInitScript(() => {
    window.ribbonFrames = 0
    const draw = WebGLRenderingContext.prototype.drawElements
    WebGLRenderingContext.prototype.drawElements = function (...args) {
      window.ribbonFrames++
      draw.apply(this, args)
    }
  })
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
  await page.goto('/')
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await page.waitForTimeout(500)
  async function sample() {
    return page.evaluate(async () => {
      const intervals: number[] = []
      const start = performance.now()
      const startFrames = window.ribbonFrames
      const longTasks: number[] = []
      const observer = new PerformanceObserver((list) =>
        list.getEntries().forEach((entry) => longTasks.push(entry.duration)),
      )
      observer.observe({ type: 'longtask', buffered: false })
      await new Promise<void>((done) => {
        let last = 0
        function frame(time: number) {
          if (last) intervals.push(time - last)
          last = time
          if (intervals.length < 90) requestAnimationFrame(frame)
          else done()
        }
        requestAnimationFrame(frame)
      })
      observer.disconnect()
      const sorted = [...intervals].sort((a, b) => a - b)
      return {
        renderHz: ((window.ribbonFrames - startFrames) * 1000) / (performance.now() - start),
        fps: 1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length),
        p95: sorted[Math.floor(sorted.length * 0.95)]!,
        longTasks,
      }
    })
  }
  const animated = await sample()
  const searchStart = Date.now()
  await page.getByRole('searchbox').fill('Внешний')
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  const searchMs = Date.now() - searchStart
  await page.getByRole('button', { name: 'Приостановить анимацию' }).click()
  const paused = await sample()
  const directory = resolve('../.artifacts/liquid-ribbon/performance')
  await mkdir(directory, { recursive: true })
  await writeFile(
    resolve(directory, `${info.project.name}.json`),
    JSON.stringify({ animated, paused, searchMs }, null, 2),
  )
  expect(searchMs).toBeLessThan(1500)
  expect(animated.fps).toBeGreaterThan(24)
  expect(animated.renderHz).toBeLessThan(info.project.name === '390' ? 35 : 66)
  expect(paused.renderHz).toBe(0)
})
