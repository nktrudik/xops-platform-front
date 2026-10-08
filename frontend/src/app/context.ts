import { inject, ref, type InjectionKey } from 'vue'
import type { CatalogRepository, ChatGateway, Copilot } from '../domain/copilot'
import { checkEmbedding } from '../services/embedding'

export function createPlatformServices(
  catalog: CatalogRepository,
  chat: ChatGateway,
  embedding = checkEmbedding,
) {
  const copilots = ref<readonly Copilot[]>([])
  const loading = ref(false)
  const error = ref('')
  const hasLoaded = ref(false)
  let pending: Promise<void> | undefined
  let interval: ReturnType<typeof setInterval> | undefined
  let controller: AbortController | undefined

  function loadCatalog(): Promise<void> {
    if (pending) return pending
    loading.value = !hasLoaded.value
    controller = new AbortController()
    const current = controller
    pending = catalog
      .list(current.signal)
      .then((items) => {
        if (current.signal.aborted) return
        copilots.value = items
        hasLoaded.value = true
        error.value = ''
      })
      .catch(() => {
        if (!current.signal.aborted)
          error.value = 'Не удалось обновить каталог. Проверьте соединение и повторите попытку.'
      })
      .finally(() => {
        loading.value = false
        pending = undefined
      })
    return pending
  }

  function startCatalogPolling(): void {
    if (interval !== undefined) return
    void loadCatalog()
    interval = setInterval(() => void loadCatalog(), 30000)
  }

  function stopCatalogPolling(): void {
    clearInterval(interval)
    interval = undefined
    controller?.abort()
  }

  return {
    copilots,
    loading,
    error,
    hasLoaded,
    loadCatalog,
    startCatalogPolling,
    stopCatalogPolling,
    chat,
    embedding,
  }
}

export type PlatformServices = ReturnType<typeof createPlatformServices>
export const platformKey: InjectionKey<PlatformServices> = Symbol('platform')

export function usePlatform(): PlatformServices {
  const services = inject(platformKey)
  if (!services) throw new Error('Сервисы платформы не настроены.')
  return services
}
