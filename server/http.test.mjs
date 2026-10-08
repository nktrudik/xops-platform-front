import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHandler } from './http.mjs'

test('сервер отдаёт SPA и шрифты, ограничивает проверку доверенными приложениями', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xops-test-'))
  const staticRoot = join(root, 'dist')
  const fontsRoot = join(root, 'fonts')
  const configPath = join(root, 'runtime.json')
  await mkdir(staticRoot)
  await mkdir(fontsRoot)
  await writeFile(join(staticRoot, 'index.html'), '<html>Платформа</html>')
  await writeFile(join(fontsRoot, 'font.woff2'), 'font')
  await writeFile(join(root, 'secret.txt'), 'secret')
  await writeFile(
    configPath,
    JSON.stringify({ applications: { alpha: 'https://example.test/app' } }),
  )
  let probed = ''
  const server = createServer(
    createHandler({
      staticRoot,
      fontsRoot,
      configPath,
      probe: async (target) => {
        probed = target
        return { state: 'ready' }
      },
    }),
  )
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    assert.match(await (await fetch(`${origin}/copilots/new`)).text(), /Платформа/)
    assert.equal((await fetch(`${origin}/brand-fonts/font.woff2`)).status, 200)
    assert.equal((await fetch(`${origin}/brand-fonts/missing.woff2`)).status, 404)
    assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404)
    assert.equal(
      (await fetch(`${origin}/internal/embedding-check?application=unknown`)).status,
      404,
    )
    assert.equal(
      (await fetch(`${origin}/internal/embedding-check?application=__proto__`)).status,
      404,
    )
    assert.equal(probed, '')
    assert.equal(
      (await (await fetch(`${origin}/internal/embedding-check?application=alpha`)).json()).state,
      'ready',
    )
    assert.equal(probed, 'https://example.test/app')
    const traversal = await fetch(`${origin}/brand-fonts/%2e%2e%2fsecret.txt`)
    assert.equal(traversal.status, 404)
    assert.equal((await fetch(origin, { method: 'POST' })).status, 405)
    await writeFile(configPath, '{}')
    assert.equal((await fetch(`${origin}/config.json`)).status, 500)
    assert.equal((await fetch(`${origin}/health`)).status, 200)
  } finally {
    await new Promise((resolve) => {
      server.close(resolve)
      server.closeAllConnections()
    })
    await rm(root, { recursive: true, force: true })
  }
})
