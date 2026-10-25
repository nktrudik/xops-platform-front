import { createReadStream, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('../', import.meta.url))
const fonts = new Map(
  [
    'MTSText-Regular',
    'MTSText-Medium',
    'MTSText-Bold',
    'MTSExtended-Medium',
    'MTSExtended-Bold',
  ].map((name) => [
    `/brand-fonts/${name}.woff2`,
    resolve(
      root,
      '../mts_shrift/ШРИФТ/Web',
      name.startsWith('MTSText') ? 'Text' : 'Extended',
      name,
      `${name}.woff2`,
    ),
  ]),
)

/** Local visual checks use ignored brand assets; production configuration stays unchanged. */
export default defineConfig({
  root,
  plugins: [
    vue(),
    {
      name: 'classic-review-fonts',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = fonts.get(request.url ?? '')
          if (!path || !existsSync(path)) return next()
          response.setHeader('Content-Type', 'font/woff2')
          createReadStream(path).pipe(response)
        })
      },
    },
  ],
})
