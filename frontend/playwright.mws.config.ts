import { defineConfig } from '@playwright/test'
import classic from './playwright.premium.config'

export default defineConfig(classic, {
  outputDir: '../.artifacts/mws-contrast/test-results',
})
