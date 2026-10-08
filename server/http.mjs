import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { readConfig } from './config.mjs'
import { probeEmbedding } from './embedding.mjs'

/** @type {Record<string, string>} */
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

/**
 * Отправляет JSON-ответ без кеширования.
 * @param {import('node:http').ServerResponse} response
 * @param {number} status
 * @param {unknown} body
 * @returns {void}
 */
function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

/**
 * Раздаёт файлы только внутри указанного корня.
 * @param {import('node:http').ServerResponse} response
 * @param {string} root
 * @param {string} path
 * @param {boolean} isFont
 * @param {boolean} headOnly
 * @returns {Promise<boolean>}
 */
async function serveFile(response, root, path, isFont, headOnly) {
  const resolvedRoot = await realpath(root)
  const candidate = await realpath(resolve(root, `.${path}`))
  if (!candidate.startsWith(`${resolvedRoot}${sep}`) || !(await stat(candidate)).isFile())
    return false
  if (isFont && extname(candidate) !== '.woff2') return false
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(candidate)] ?? 'application/octet-stream',
    'Cache-Control': isFont || path.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache',
  })
  if (headOnly) response.end()
  else await pipeline(createReadStream(candidate), response)
  return true
}

/**
 * Минимальный локальный сервер статики и проверки iframe; API Copilot не подменяет.
 * @param {{staticRoot: string, fontsRoot: string, configPath: string, probe?: typeof probeEmbedding}} options
 * @returns {(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse) => Promise<void>}
 */
export function createHandler({ staticRoot, fontsRoot, configPath, probe = probeEmbedding }) {
  return async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src http: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    )
    if (!['GET', 'HEAD'].includes(request.method ?? ''))
      return json(response, 405, { error: 'Метод не поддерживается.' })
    try {
      const origin = `http://${request.headers.host}`
      const url = new URL(request.url ?? '/', origin)
      if (url.pathname === '/health') return json(response, 200, { status: 'ok' })
      if (url.pathname === '/config.json') return json(response, 200, await readConfig(configPath))
      if (url.pathname === '/internal/embedding-check') {
        const config = await readConfig(configPath)
        const key = url.searchParams.get('application')
        const target =
          key && Object.hasOwn(config.applications, key) ? config.applications[key] : undefined
        if (!target) return json(response, 404, { error: 'Приложение не настроено.' })
        return json(response, 200, await probe(target, origin))
      }
      const path = decodeURIComponent(url.pathname)
      const font = path.startsWith('/brand-fonts/')
      const filePath = font ? path.slice('/brand-fonts'.length) : path
      try {
        if (
          await serveFile(
            response,
            font ? fontsRoot : staticRoot,
            filePath,
            font,
            request.method === 'HEAD',
          )
        )
          return
      } catch (error) {
        if (response.headersSent) throw error
      }
      if (font || path.startsWith('/assets/') || extname(path))
        return json(response, 404, { error: 'Файл не найден.' })
      if (await serveFile(response, staticRoot, '/index.html', false, request.method === 'HEAD'))
        return
      json(response, 404, { error: 'Файл не найден.' })
    } catch {
      if (response.headersSent) response.destroy()
      else
        json(response, 500, {
          error: 'Не удалось обработать запрос. Проверьте локальную конфигурацию.',
        })
    }
  }
}
