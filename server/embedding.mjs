/**
 * Проверяет frame-ancestors для единственного родительского окна платформы.
 * @param {string} source
 * @param {string} targetUrl
 * @param {string} parentOrigin
 * @returns {boolean}
 */
function allowsAncestor(source, targetUrl, parentOrigin) {
  if (source === '*') return true
  if (source === "'self'") return new URL(targetUrl).origin === parentOrigin
  if (source === "'none'") return false
  if (/^https?:$/.test(source)) return new URL(parentOrigin).protocol === source
  try {
    const parent = new URL(parentOrigin)
    const scheme = source.includes('://') ? '' : `${new URL(targetUrl).protocol}//`
    const normalized = source.replace(/:\*$/, '').replace(/^(https?:\/\/)?\*\./, '$1wildcard.')
    const candidate = new URL(`${scheme}${normalized}`)
    const wildcard = candidate.hostname.startsWith('wildcard.')
    const domain = candidate.hostname.replace(/^wildcard\./, '')
    const hostMatches = wildcard
      ? parent.hostname.endsWith(`.${domain}`)
      : parent.hostname === domain
    const portMatches = candidate.port === parent.port || source.endsWith(':*')
    return candidate.protocol === parent.protocol && hostMatches && portMatches
  } catch {
    return false
  }
}

/**
 * @typedef {{ state: 'ready' } | { state: 'blocked' | 'unavailable', reason: string }} EmbeddingResult
 */

/**
 * Определяет запрет встраивания по заголовкам ответа.
 * @param {Headers} headers
 * @param {string} targetUrl
 * @param {string} parentOrigin
 * @returns {EmbeddingResult}
 */
export function embeddingPolicy(headers, targetUrl, parentOrigin) {
  const csp = headers.get('content-security-policy')
  const ancestorPolicies = (csp ?? '').split(',').flatMap((policy) => {
    const directive = policy
      .split(';')
      .map((part) => part.trim())
      .find((part) => /^frame-ancestors(?:\s|$)/i.test(part))
    return directive === undefined ? [] : [directive.split(/\s+/).slice(1)]
  })
  if (ancestorPolicies.length) {
    if (
      ancestorPolicies.some(
        (sources) => !sources.some((source) => allowsAncestor(source, targetUrl, parentOrigin)),
      )
    ) {
      return {
        state: 'blocked',
        reason: 'Приложение запрещает встраивание в платформу (Content-Security-Policy).',
      }
    }
    return { state: 'ready' }
  }
  const xfo = headers.get('x-frame-options')?.trim().toUpperCase()
  if (
    xfo?.split(',').some((value) => value.trim() === 'DENY') ||
    (xfo?.includes('SAMEORIGIN') && new URL(targetUrl).origin !== parentOrigin)
  ) {
    return {
      state: 'blocked',
      reason: 'Приложение запрещает встраивание в платформу (X-Frame-Options).',
    }
  }
  return { state: 'ready' }
}

/**
 * Запрос возможен только к адресу из доверенной локальной конфигурации.
 * @param {string} targetUrl
 * @param {string} parentOrigin
 * @param {typeof fetch} [fetcher]
 * @param {number} [timeoutMs]
 * @returns {Promise<EmbeddingResult>}
 */
export async function probeEmbedding(targetUrl, parentOrigin, fetcher = fetch, timeoutMs = 8000) {
  try {
    const signal = AbortSignal.timeout(timeoutMs)
    let currentUrl = new URL(targetUrl)
    for (let redirects = 0; redirects <= 5; redirects++) {
      if (
        !['http:', 'https:'].includes(currentUrl.protocol) ||
        currentUrl.username ||
        currentUrl.password
      ) {
        return {
          state: 'blocked',
          reason: 'Адрес приложения использует неподдерживаемый протокол или данные доступа.',
        }
      }
      if (new URL(parentOrigin).protocol === 'https:' && currentUrl.protocol === 'http:') {
        return {
          state: 'blocked',
          reason: 'Браузер запрещает встраивание HTTP-приложения в HTTPS-страницу.',
        }
      }
      const response = await fetcher(currentUrl, { signal, redirect: 'manual' })
      await response.body?.cancel()
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) break
        currentUrl = new URL(location, currentUrl)
        continue
      }
      if (!response.ok)
        return {
          state: 'unavailable',
          reason: `Приложение вернуло ошибку HTTP ${response.status}. Повторите попытку позже.`,
        }
      return embeddingPolicy(response.headers, currentUrl.href, parentOrigin)
    }
    return {
      state: 'unavailable',
      reason: 'Приложение возвращает слишком много перенаправлений или некорректный адрес.',
    }
  } catch {
    return {
      state: 'unavailable',
      reason:
        'Приложение недоступно или не ответило вовремя. Проверьте подключение и повторите попытку.',
    }
  }
}
