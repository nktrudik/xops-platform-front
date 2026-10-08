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
  let pending: Promise<void> | undefined

  function loadCatalog(): Promise<void> {
    if (pending) return pending
    loading.value = true
    error.value = ''
    pending = catalog
      .list()
      .then((items) => {
        copilots.value = items
      })
      .catch(() => {
        error.value = 'Не удалось загрузить каталог. Проверьте конфигурацию и повторите попытку.'
      })
      .finally(() => {
        loading.value = false
        pending = undefined
      })
    return pending
  }

  return { copilots, loading, error, loadCatalog, chat, embedding }
}

export type PlatformServices = ReturnType<typeof createPlatformServices>
export const platformKey: InjectionKey<PlatformServices> = Symbol('platform')

export function usePlatform(): PlatformServices {
  const services = inject(platformKey)
  if (!services) throw new Error('Сервисы платформы не настроены.')
  return services
}
