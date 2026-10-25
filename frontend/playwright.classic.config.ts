import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  outputDir: '../.artifacts/liquid-ribbon/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: '1920', use: { viewport: { width: 1920, height: 1080 } } },
    { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command:
      'npm exec vite -- --config tests/classic.vite.config.ts --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: true,
  },
})
