import { test } from 'node:test'
import assert from 'node:assert/strict'
import { embeddingPolicy, probeEmbedding } from './embedding.mjs'

const target = 'https://copilot.example/app'
const parent = 'http://localhost:8080'

test('X-Frame-Options и CSP запрещают встраивание', () => {
  for (const headers of [
    { 'x-frame-options': 'DENY' },
    { 'x-frame-options': 'SAMEORIGIN' },
    { 'content-security-policy': "frame-ancestors 'none'" },
    { 'content-security-policy': "frame-ancestors 'self'" },
  ]) {
    assert.equal(embeddingPolicy(new Headers(headers), target, parent).state, 'blocked')
  }
})

test('разрешённый родитель и приоритет CSP над X-Frame-Options', () => {
  assert.equal(
    embeddingPolicy(
      new Headers({
        'content-security-policy': `frame-ancestors ${parent}`,
        'x-frame-options': 'DENY',
      }),
      target,
      parent,
    ).state,
    'ready',
  )
  assert.equal(
    embeddingPolicy(
      new Headers({ 'content-security-policy': "default-src 'self'" }),
      target,
      parent,
    ).state,
    'ready',
  )
  assert.equal(
    embeddingPolicy(
      new Headers({ 'content-security-policy': 'frame-ancestors https://*.example.com' }),
      target,
      'https://portal.example.com',
    ).state,
    'ready',
  )
})

test('все CSP-политики должны разрешать встраивание', () => {
  assert.equal(
    embeddingPolicy(
      new Headers({
        'content-security-policy': `frame-ancestors ${parent}, frame-ancestors 'none'`,
      }),
      target,
      parent,
    ).state,
    'blocked',
  )
})

test('недоступность сети и HTTP-ошибки превращаются в понятный результат', async () => {
  assert.equal(
    (
      await probeEmbedding(target, parent, async () => {
        throw new Error('Сеть')
      })
    ).state,
    'unavailable',
  )
  const result = await probeEmbedding(target, parent, async () => new Response('', { status: 503 }))
  assert.equal(result.state, 'unavailable')
  assert.match(result.reason, /503/)
})

test('учитывается политика после перенаправления', async () => {
  let calls = 0
  const result = await probeEmbedding(target, parent, async () =>
    ++calls === 1
      ? new Response(null, { status: 302, headers: { location: '/login' } })
      : new Response('', { headers: { 'x-frame-options': 'DENY' } }),
  )
  assert.equal(result.state, 'blocked')
  assert.equal(calls, 2)
})

test('проверка iframe запрашивает актуальные заголовки без использования кеша', async () => {
  const result = await probeEmbedding(target, parent, async (_url, options) => {
    assert.equal(options.cache, 'no-store')
    return new Response('')
  })
  assert.equal(result.state, 'ready')
})

test('HTTPS-платформа не встраивает HTTP, опасные протоколы отклоняются', async () => {
  assert.equal(
    (await probeEmbedding('http://example.test', 'https://portal.test')).state,
    'blocked',
  )
  assert.equal((await probeEmbedding('file:///etc/passwd', parent)).state, 'blocked')
})
