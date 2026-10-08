import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { createHandler } from './http.mjs'

const server = createServer(
  createHandler({
    staticRoot: resolve('dist'),
    fontsRoot: process.env.MTS_FONTS_ROOT ?? '/brand-fonts',
    configPath: process.env.XOPS_CONFIG_PATH ?? resolve('config/runtime.json'),
  }),
)

server.listen(8080, '0.0.0.0')
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close()
    server.closeIdleConnections()
  })
}
