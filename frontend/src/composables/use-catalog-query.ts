import { shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Copilot } from '../domain/copilot'

export type CatalogFormat = 'all' | NonNullable<Copilot['interfaceType']>

function readFormat(value: unknown): CatalogFormat {
  return value === 'chat' || value === 'embedded' || value === 'external' ? value : 'all'
}

/** Keeps catalog controls in the URL so refresh and Back preserve the selection. */
export function useCatalogQuery() {
  const route = useRoute()
  const router = useRouter()
  const query = shallowRef(typeof route.query.q === 'string' ? route.query.q : '')
  const format = shallowRef<CatalogFormat>(readFormat(route.query.format))

  watch(
    () => route.query,
    (params) => {
      query.value = typeof params.q === 'string' ? params.q : ''
      format.value = readFormat(params.format)
    },
  )

  watch([query, format], ([q, selected]) => {
    const routeQuery = typeof route.query.q === 'string' ? route.query.q : ''
    if (routeQuery === q && readFormat(route.query.format) === selected) return
    void router.replace({
      query: {
        ...route.query,
        q: q || undefined,
        format: selected === 'all' ? undefined : selected,
      },
    })
  })

  function reset(): void {
    query.value = ''
    format.value = 'all'
  }
  return { query, format, reset }
}
