import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('../', import.meta.url))
/** Visual checks use the same bundled fonts as the application. */
export default defineConfig({
  root,
  plugins: [vue()],
})
