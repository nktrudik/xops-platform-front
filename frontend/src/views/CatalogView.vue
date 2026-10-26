<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { usePlatform } from '../app/context'
import { searchCopilots } from '../domain/copilot'
import { useCatalogQuery, type CatalogFormat } from '../composables/use-catalog-query'
import ClassicHero from '../components/ClassicHero.vue'
import CopilotCard from '../components/CopilotCard.vue'
import CatalogState from '../components/CatalogState.vue'
import CatalogNotice from '../components/CatalogNotice.vue'

const { copilots, loading, error, hasLoaded, loadCatalog } = usePlatform()
const { query, format, reset } = useCatalogQuery()
const catalog = useTemplateRef<HTMLElement>('catalog')
const title = useTemplateRef<HTMLElement>('title')
const formatNames = { chat: 'Чат', embedded: 'Встроенный UI', external: 'Внешние продукты' }
const results = computed(() =>
  searchCopilots(copilots.value, query.value).filter(
    (copilot) => format.value === 'all' || copilot.interfaceType === format.value,
  ),
)
const filters = computed(() => {
  const options: { value: CatalogFormat; label: string; count: number }[] = [
    { value: 'all', label: 'Все', count: copilots.value.length },
  ]
  for (const value of ['chat', 'embedded', 'external'] as const) {
    const count = copilots.value.filter((copilot) => copilot.interfaceType === value).length
    if (count || format.value === value) options.push({ value, label: formatNames[value], count })
  }
  return options
})
const state = computed(() => {
  if (loading.value) return 'loading'
  if (error.value && !hasLoaded.value) return 'error'
  if (!copilots.value.length) return 'empty'
  if (!results.value.length) return 'no-results'
  return null
})
const isFiltered = computed(() => Boolean(query.value.trim()) || format.value !== 'all')

function focusResults(): void {
  title.value?.focus({ preventScroll: true })
  catalog.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  })
}

/** Fix the departing card in place while TransitionGroup moves its neighbours. */
function beforeLeave(element: Element): void {
  if (!(element instanceof HTMLElement)) return
  const { offsetWidth, offsetLeft, offsetTop } = element
  Object.assign(element.style, {
    width: `${offsetWidth}px`,
    left: `${offsetLeft}px`,
    top: `${offsetTop}px`,
  })
  element.inert = true
}

function clearDeparture(element: Element): void {
  if (!(element instanceof HTMLElement)) return
  for (const property of ['width', 'left', 'top']) element.style.removeProperty(property)
  element.inert = false
}
</script>

<template>
  <ClassicHero v-model="query" @submit="focusResults" />
  <section
    id="catalog"
    ref="catalog"
    class="catalog-section"
    aria-labelledby="catalog-title"
    :aria-busy="loading"
  >
    <div class="section-heading">
      <div>
        <span class="section-eyebrow">Инструменты платформы</span>
        <h2 id="catalog-title" ref="title" class="catalog-title" tabindex="-1">Каталог Copilot</h2>
      </div>
      <span
        v-if="!loading && hasLoaded"
        class="catalog-count"
        aria-live="polite"
        aria-atomic="true"
        >{{ isFiltered ? `Найдено: ${results.length}` : `${copilots.length} Copilot` }}</span
      >
    </div>
    <div v-if="hasLoaded && copilots.length" class="catalog-toolbar">
      <div class="format-filters" role="group" aria-label="Формат взаимодействия">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="format-filter"
          :aria-pressed="format === filter.value"
          @click="format = filter.value"
        >
          {{ filter.label }}<span class="filter-count">{{ filter.count }}</span>
        </button>
      </div>
      <button v-if="isFiltered" class="filter-reset text-button" @click="reset">
        Сбросить фильтры
      </button>
    </div>
    <Transition name="catalog-state" mode="out-in">
      <CatalogState
        v-if="state"
        :key="state"
        :state="state"
        :error="error"
        @retry="loadCatalog"
        @reset="reset"
      />
      <TransitionGroup
        v-else
        name="catalog-item"
        tag="div"
        class="catalog-grid"
        :class="{ 'catalog-grid-small': results.length <= 2 }"
        appear
        @before-leave="beforeLeave"
        @before-enter="clearDeparture"
        @leave-cancelled="clearDeparture"
      >
        <CopilotCard
          v-for="(copilot, index) in results"
          :key="copilot.id"
          :copilot="copilot"
          :style="{ '--card-delay': `${Math.min(index, 7) * 35}ms` }"
        />
      </TransitionGroup>
    </Transition>
    <CatalogNotice />
  </section>
</template>

<style scoped>
.catalog-section {
  margin-top: 28px;
  scroll-margin-top: 28px;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.section-eyebrow {
  color: var(--text-secondary);
  font-size: 11px;
  letter-spacing: 0.5px;
}
.catalog-title {
  margin: 8px 0 0;
  font-size: clamp(23px, 2.15vw, 30px);
  letter-spacing: -0.8px;
  line-height: 1.2;
  scroll-margin-top: 28px;
}
.catalog-count {
  padding-bottom: 3px;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.catalog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.format-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}
.format-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 9px 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  font-size: 12px;
  transition:
    color var(--motion-fast),
    background var(--motion-fast),
    border-color var(--motion-fast);
}
.format-filter:hover {
  background: var(--surface-soft);
  color: var(--text);
}
.format-filter[aria-pressed='true'] {
  background: var(--white);
  color: var(--text);
  border-color: var(--border-strong);
  box-shadow: 0 2px 4px #20202704;
}
.filter-count {
  min-width: 17px;
  color: var(--text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.format-filter[aria-pressed='true'] .filter-count {
  color: var(--red);
}
.filter-reset {
  min-height: 40px;
  font-size: 12px;
}
.catalog-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.catalog-grid-small {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.catalog-item-enter-active {
  transition:
    opacity var(--motion-enter) var(--ease-out),
    transform var(--motion-enter) var(--ease-out);
  transition-delay: var(--card-delay, 0ms);
}
.catalog-item-leave-active {
  position: absolute;
  transition:
    opacity var(--motion-fast),
    transform var(--motion-fast);
  pointer-events: none;
}
.catalog-item-move {
  transition: transform var(--motion-ui) var(--ease-out);
}
.catalog-item-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.catalog-item-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
.catalog-state-enter-active,
.catalog-state-leave-active {
  transition: opacity var(--motion-fast);
}
.catalog-state-enter-from,
.catalog-state-leave-to {
  opacity: 0;
}
@media (max-width: 1180px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .catalog-section {
    margin-top: 28px;
  }
  .section-heading {
    gap: 12px;
    margin-bottom: 16px;
  }
  .catalog-title {
    font-size: 23px;
    letter-spacing: -0.6px;
  }
  .catalog-count {
    font-size: 11px;
  }
  .format-filter {
    min-height: 44px;
    padding: 9px 10px;
    font-size: 11px;
    gap: 5px;
  }
  .format-filters {
    gap: 4px;
  }
  .catalog-toolbar {
    gap: 4px;
    margin-bottom: 16px;
  }
  .catalog-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
}
</style>
