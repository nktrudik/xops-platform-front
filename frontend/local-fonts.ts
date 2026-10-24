import { createReadStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** Dev-сервер читает локальные шрифты без копирования корпоративных материалов в сборку. */
export function localBrandFonts(): Plugin {
  const fonts: Record<string, string> = {
    'MTSText-Regular': 'Text',
    'MTSText-Medium': 'Text',
    'MTSText-Bold': 'Text',
    'MTSExtended-Medium': 'Extended',
    'MTSExtended-Bold': 'Extended',
  }
  return {
    name: 'local-brand-fonts',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url
          ?.split('?')[0]
          ?.split('/')
          .at(-1)
          ?.replace(/\.woff2$/, '')
        const family = name ? fonts[name] : undefined
        if (!request.url?.includes('/brand-fonts/') || !name || !family) return next()
        const file = resolve(
          server.config.root,
          '../mts_shrift/ШРИФТ/Web',
          family,
          name,
          `${name}.woff2`,
        )
        if (!existsSync(file)) return next()
        response.setHeader('Content-Type', 'font/woff2')
        createReadStream(file).pipe(response)
      })
    },
  }
}
