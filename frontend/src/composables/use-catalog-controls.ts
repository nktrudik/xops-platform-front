import { computed, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchCopilots, type Copilot } from '../domain/copilot'

export type CatalogFormat = 'all' | 'chat' | 'embedded' | 'external'

/** Фильтры представления каталога; исходные данные и обновление остаются у сервиса платформы. */
export function useCatalogControls(copilots: Ref<readonly Copilot[]>) {
  const route = useRoute()
  const router = useRouter()
  function update(key: string, value: string): void {
    void router.replace({ query: { ...route.query, [key]: value || undefined } })
  }
  const query = computed({
    get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
    set: (value: string) => update('q', value),
  })
  const format = computed<CatalogFormat>({
    get: () =>
      route.query.interface === 'chat' ||
      route.query.interface === 'embedded' ||
      route.query.interface === 'external'
        ? route.query.interface
        : 'all',
    set: (value) => update('interface', value === 'all' ? '' : value),
  })
  const availableOnly = computed({
    get: () => route.query.available === 'true',
    set: (value: boolean) => update('available', value ? 'true' : ''),
  })
  const listView = computed({
    get: () => route.query.view === 'list',
    set: (value: boolean) => update('view', value ? 'list' : ''),
  })
  const counts = computed(() => ({
    all: copilots.value.length,
    chat: copilots.value.filter((item) => item.interfaceType === 'chat').length,
    embedded: copilots.value.filter((item) => item.interfaceType === 'embedded').length,
    external: copilots.value.filter((item) => item.interfaceType === 'external').length,
  }))
  const results = computed(() =>
    searchCopilots(copilots.value, query.value).filter(
      (item) =>
        (format.value === 'all' || item.interfaceType === format.value) &&
        (!availableOnly.value || item.status === 'available'),
    ),
  )
  function reset(): void {
    void router.replace({
      query: { ...route.query, q: undefined, interface: undefined, available: undefined },
    })
  }
  return { query, format, availableOnly, listView, counts, results, reset }
}
