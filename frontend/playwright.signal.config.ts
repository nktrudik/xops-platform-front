import { defineConfig } from '@playwright/test'
import base from './playwright.redesign.config'

export default defineConfig(base, {
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'widescreen', use: { viewport: { width: 1920, height: 1080 } } },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
})
