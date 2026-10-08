import { readFile } from 'node:fs/promises'

/**
 * Адреса берутся из локального runtime-файла, без пересборки frontend.
 * @param {string} path
 * @returns {Promise<{applications: Record<string, string>}>}
 */
export async function readConfig(path) {
  const config = /** @type {unknown} */ (JSON.parse(await readFile(path, 'utf8')))
  if (
    !config ||
    typeof config !== 'object' ||
    !('applications' in config) ||
    !config.applications ||
    typeof config.applications !== 'object' ||
    Array.isArray(config.applications)
  ) {
    throw new Error('Некорректная конфигурация приложений.')
  }
  const applications = Object.fromEntries(
    Object.entries(config.applications).map(([key, value]) => {
      if (typeof value !== 'string') throw new Error(`Некорректный адрес приложения «${key}».`)
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error(`Некорректный адрес приложения «${key}».`)
      }
      return [key, url.href]
    }),
  )
  return { applications }
}
