import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  testMatch: 'sidebar.spec.ts',
  outputDir: '../.artifacts/sidebar-responsive/test-results',
  projects: [
    ...[
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1280, 720],
      [1024, 768],
    ].map(([width, height]) => ({
      name: `${width}x${height}`,
      use: { viewport: { width: width!, height: height! } },
    })),
    {
      name: '390x844',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm exec vite -- --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176/',
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://127.0.0.1:5176',
    channel: 'chrome',
    trace: 'retain-on-failure',
    launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
  },
})
