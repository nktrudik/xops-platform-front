import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { localBrandFonts } from './local-fonts.ts'

export default defineConfig({
  // CI передаёт VITE_BASE_PATH=/<env>/platform-xops/ (path-схема). Локально → '/'.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [vue(), localBrandFonts()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
  },
})
