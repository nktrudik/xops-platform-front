import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

function contrast(foreground: string, background: string): number {
  function luminance(color: string): number {
    return color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((channel) => channel / 255)
      .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0)
  }
  const values = [luminance(foreground), luminance(background)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

test.beforeEach(async ({ page }) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) =>
    route.fulfill({ json: [apiCopilots[0], apiCopilots[2]] }),
  )
})

test('MWS visual review: identity, filters and card interaction', async ({ page }, info) => {
  const phase = process.env.MWS_BEFORE ? 'before' : 'after'
  const directory = resolve('../.artifacts/mws-contrast', phase, info.project.name)
  await mkdir(directory, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await expect(page.locator('.liquid-ribbon')).toHaveAttribute('data-renderer', 'webgl')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Приостановить анимацию' }).click()
  await page.screenshot({ path: resolve(directory, 'page.png') })
  await page.screenshot({ path: resolve(directory, 'page-full.png'), fullPage: true })
  await page.locator('.app-header').screenshot({ path: resolve(directory, 'header.png') })
  await page.locator('#catalog').screenshot({ path: resolve(directory, 'catalog-all.png') })
  const contrasts: { label: string; ratio: number; minimum: number }[] = []
  if (!process.env.MWS_BEFORE) {
    const logo = page.locator('.brand-logo')
    await expect(logo).toBeVisible()
    expect(
      await logo.evaluate(
        (element) =>
          element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
      ),
    ).toBe(true)
    await expect(page.locator('.format-filter[aria-pressed="true"]')).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    )
    await expect(page.locator('.format-filter[aria-pressed="true"]')).toHaveCSS(
      'background-color',
      'rgb(32, 32, 39)',
    )
    const samples = await page.evaluate(() => {
      const style = (selector: string) => getComputedStyle(document.querySelector(selector)!)
      const foregrounds = [
        '.header-link.is-current',
        '.format-filter[aria-pressed="true"]',
        '.format-filter[aria-pressed="false"]',
        '.format-filter[aria-pressed="true"] .filter-count',
        '.card-open',
        '.status-available',
      ].map((selector) => {
        const value = style(selector)
        return {
          label: selector,
          foreground: value.color,
          background: value.backgroundColor,
          minimum: 4.5,
        }
      })
      const borders = ['.format-filter[aria-pressed="false"]', '.search-form', '.sign-out'].map(
        (selector) => {
          const value = style(selector)
          return {
            label: selector + ' boundary',
            foreground: value.borderTopColor,
            background:
              selector === '.sign-out'
                ? style('.app-header').backgroundColor
                : value.backgroundColor,
            minimum: 3,
          }
        },
      )
      return [...foregrounds, ...borders]
    })
    for (const sample of samples) {
      const ratio = contrast(sample.foreground, sample.background)
      contrasts.push({ label: sample.label, ratio, minimum: sample.minimum })
      expect(ratio, sample.label).toBeGreaterThanOrEqual(sample.minimum)
    }
  }
  await page.getByRole('button', { name: /^Чат/ }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(1)
  await page.waitForTimeout(450)
  await page.locator('#catalog').screenshot({ path: resolve(directory, 'catalog-chat.png') })
  await expect(page.getByRole('button', { name: /^Чат/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /^Чат/ }).focus()
  await page.locator('#catalog').screenshot({ path: resolve(directory, 'filter-focus.png') })
  await page.getByRole('button', { name: /^Все/ }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await page.waitForTimeout(600)
  if (!info.project.use.isMobile) {
    await page.locator('.card-open').first().hover()
    await page.waitForTimeout(300)
    await page.locator('#catalog').screenshot({ path: resolve(directory, 'card-hover.png') })
  }
  await page.getByRole('searchbox').focus()
  await page.waitForTimeout(300)
  await page.locator('.hero').screenshot({ path: resolve(directory, 'search-focus.png') })
  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    hero: document.querySelector('.hero')!.getBoundingClientRect().height,
    cards: [...document.querySelectorAll('.copilot-card')].map((card) => ({
      width: card.getBoundingClientRect().width,
      height: card.getBoundingClientRect().height,
    })),
  }))
  await writeFile(
    resolve(directory, 'checks.json'),
    JSON.stringify({ geometry, contrasts, errors }, null, 2),
  )
  expect(geometry.overflow).toBe(false)
  expect(errors).toEqual([])
})

test('MWS header preserves sign-out recovery and sign-in navigation', async ({ page }, info) => {
  test.skip(Boolean(process.env.MWS_BEFORE), 'Baseline mode captures the pre-MWS interface only')
  let failed = true
  await page.route('**/api/auth/logout', async (route) => {
    expect(route.request().method()).toBe('POST')
    expect(route.request().headers()['x-xops-csrf']).toBe('test-csrf')
    await route.fulfill(failed ? { status: 503, json: { detail: 'Unavailable' } } : { status: 204 })
  })
  await page.route('**/api/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ username: 'admin', password: 'test-password' })
    await route.fulfill({
      json: { id: 1, username: 'admin', role: 'admin', csrf_token: 'test-csrf' },
    })
  })
  await page.goto('/')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Не удалось выйти. Повторите попытку.')
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  failed = false
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Вход в платформу' })).toBeVisible()
  await expect(page.locator('.brand-logo')).toBeVisible()
  const directory = resolve('../.artifacts/mws-contrast/after', info.project.name)
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: resolve(directory, 'login.png'), fullPage: true })
  await page.getByLabel('Пароль', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.locator('.copilot-card')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Каталог Copilot', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
})
