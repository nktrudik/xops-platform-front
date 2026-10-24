<script setup lang="ts">
import { usePlatform } from '../app/context'
import { useCatalogControls } from '../composables/use-catalog-controls'
import type { CatalogFormat } from '../composables/use-catalog-controls'
import WorkspaceOverview from '../components/WorkspaceOverview.vue'
import CatalogSkeleton from '../components/CatalogSkeleton.vue'
import AppIcon from '../components/AppIcon.vue'
import CopilotCard from '../components/CopilotCard.vue'
import StatePanel from '../components/StatePanel.vue'
import CatalogNotice from '../components/CatalogNotice.vue'
defineProps<{ overview?: boolean }>()
const { copilots, loading, error, hasLoaded, loadCatalog } = usePlatform()
const { query, format, availableOnly, listView, counts, results, reset } =
  useCatalogControls(copilots)
const formats: { id: CatalogFormat; label: string }[] = [
  { id: 'all', label: 'Все Copilot' },
  { id: 'chat', label: 'Чат' },
  { id: 'embedded', label: 'Встроенный UI' },
  { id: 'external', label: 'Внешние продукты' },
]
function focusResults(): void {
  document.getElementById('catalog-title')?.focus({ preventScroll: true })
}
</script>
<template>
  <WorkspaceOverview v-if="overview" />
  <section
    id="catalog"
    class="catalog-section"
    :class="{ 'catalog-overview': overview }"
    aria-labelledby="catalog-title"
  >
    <div class="catalog-heading">
      <div>
        <span v-if="!overview" class="section-eyebrow">Инструменты команд МТС</span
        ><component :is="overview ? 'h2' : 'h1'" id="catalog-title" tabindex="-1">{{
          overview ? 'Ваши AI-помощники' : 'Каталог Copilot'
        }}</component>
        <p>
          {{
            overview
              ? 'Выберите инструмент под свою задачу.'
              : 'Все помощники платформы — в одном рабочем пространстве.'
          }}
        </p>
      </div>
      <button
        class="catalog-refresh"
        aria-label="Обновить каталог"
        :disabled="loading"
        @click="loadCatalog"
      >
        <AppIcon name="refresh" /><span>Обновить каталог</span>
      </button>
    </div>
    <div class="catalog-toolbar">
      <form class="catalog-search" role="search" @submit.prevent="focusResults">
        <AppIcon name="search" /><label class="sr-only" for="copilot-search">Поиск Copilot</label
        ><input
          id="copilot-search"
          v-model="query"
          name="q"
          type="search"
          autocomplete="off"
          placeholder="Найти Copilot или описать задачу…"
        /><button
          v-if="query"
          class="icon-button"
          type="button"
          aria-label="Очистить поиск"
          @click="query = ''"
        >
          <AppIcon name="close" /></button
        ><kbd v-if="!query" aria-hidden="true">Поиск</kbd>
      </form>
      <label class="catalog-availability"
        ><input v-model="availableOnly" type="checkbox" /><span>Только доступные</span></label
      >
      <div class="catalog-view" role="group" aria-label="Вид каталога">
        <button
          class="icon-button"
          :aria-pressed="!listView"
          aria-label="Показать карточками"
          @click="listView = false"
        >
          <AppIcon name="grid" /></button
        ><button
          class="icon-button"
          :aria-pressed="listView"
          aria-label="Показать списком"
          @click="listView = true"
        >
          <AppIcon name="list" />
        </button>
      </div>
    </div>
    <div class="catalog-filter-bar">
      <div class="catalog-formats" role="group" aria-label="Формат взаимодействия">
        <button
          v-for="item in formats"
          :key="item.id"
          :aria-pressed="format === item.id"
          @click="format = item.id"
        >
          {{ item.label }}<span v-if="hasLoaded">{{ counts[item.id] }}</span>
        </button>
      </div>
      <span v-if="hasLoaded" class="catalog-result-count" aria-live="polite"
        >{{ results.length }} из {{ copilots.length }}</span
      >
    </div>
    <CatalogSkeleton v-if="loading" />
    <StatePanel v-else-if="error && !hasLoaded" title="Каталог недоступен" :description="error"
      ><button class="button button-primary" @click="loadCatalog">
        Повторить попытку
      </button></StatePanel
    >
    <StatePanel
      v-else-if="!copilots.length"
      title="В каталоге пока нет Copilot"
      description="Приложения появятся здесь после добавления в каталог."
    />
    <StatePanel
      v-else-if="!results.length"
      title="Ничего не найдено"
      description="Попробуйте другое название, формат или отключите фильтр доступности."
      ><button class="button button-secondary" @click="reset">Очистить поиск</button></StatePanel
    >
    <div
      v-else
      class="catalog-grid"
      :class="{ 'catalog-list': listView, 'catalog-large': results.length > 50 }"
    >
      <CopilotCard v-for="copilot in results" :key="copilot.id" :copilot="copilot" />
    </div>
    <CatalogNotice />
    <div class="catalog-note">
      <AppIcon name="info" />
      <p>
        Каждый Copilot создан для своего круга задач. Формат работы и доступность указаны в
        карточке.
      </p>
    </div>
  </section>
</template>
<style scoped>
.catalog-section {
  scroll-margin-top: 100px;
}
.catalog-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}
.catalog-heading h1,
.catalog-heading h2 {
  font-size: 25px;
  margin: 10px 0;
  letter-spacing: -0.7px;
  line-height: 1.4;
}
.catalog-overview .catalog-heading h2 {
  font-size: 22px;
  margin-top: 0;
}
.catalog-heading p {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
  line-height: 1.6;
}
.catalog-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 10px 10px;
  background: none;
  border: 0;
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}
.catalog-refresh svg {
  width: 15px;
  height: 15px;
}
.catalog-refresh:hover {
  color: var(--red);
}
.catalog-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px 10px 0 0;
}
.catalog-search {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f7f8fa;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 0 12px;
  flex: 1;
  min-width: 0;
}
.catalog-search:focus-within {
  border-color: var(--red);
  box-shadow: 0 0 0 3px var(--red-soft);
}
.catalog-search > svg {
  color: var(--muted);
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.catalog-search input {
  height: 42px;
  width: 100%;
  min-width: 0;
  padding: 0;
  background: none;
  border: 0;
  font-size: 13px;
  color: var(--text);
}
.catalog-search input:focus-visible {
  outline: none;
}
.catalog-search input::placeholder {
  color: var(--text-secondary);
}
.catalog-search input::-webkit-search-cancel-button {
  display: none;
}
.catalog-search .icon-button {
  padding: 4px;
  height: 28px;
  width: 28px;
}
.catalog-search .icon-button svg {
  width: 16px;
  height: 16px;
}
.catalog-search kbd {
  font: 400 9px var(--font-body);
  color: var(--muted);
  padding-left: 12px;
  border-left: 1px solid var(--border);
}
.catalog-availability {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}
.catalog-availability input {
  appearance: auto;
  accent-color: var(--red);
  width: 14px;
  height: 14px;
  margin: 0;
}
.catalog-view {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.catalog-view button {
  height: 32px;
  width: 32px;
  padding: 7px;
  border-radius: 4px;
}
.catalog-view button svg {
  width: 16px;
  height: 16px;
}
.catalog-view button[aria-pressed='true'] {
  background: #edf0f3;
  color: var(--text);
}
.catalog-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border);
  border-top: 0;
  padding: 0 16px;
  margin-bottom: 20px;
  background: white;
  border-radius: 0 0 10px 10px;
}
.catalog-formats {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
}
.catalog-formats button {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 48px;
  padding: 10px 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-secondary);
  font-size: 11px;
  transition:
    color 160ms,
    border-color 160ms;
}
.catalog-formats button > span {
  font-size: 9px;
  color: #686e78;
  background: #f1f3f5;
  padding: 2px 5px;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}
.catalog-formats button:hover {
  color: var(--red);
}
.catalog-formats button[aria-pressed='true'] {
  color: var(--red);
  border-bottom-color: var(--red);
}
.catalog-formats button[aria-pressed='true'] > span {
  color: var(--red);
  background: var(--red-soft);
}
.catalog-result-count {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--text-secondary);
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.catalog-list {
  grid-template-columns: 1fr;
}
.catalog-large > :deep(.copilot-card) {
  content-visibility: auto;
  contain-intrinsic-size: auto 258px;
}
.catalog-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 20px;
  margin-top: 4px;
  color: var(--text-secondary);
}
.catalog-note svg {
  height: 14px;
  width: 14px;
  margin-top: 1px;
  flex-shrink: 0;
}
.catalog-note p {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
}
@media (max-width: 1250px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .catalog-grid.catalog-list {
    grid-template-columns: 1fr;
  }
  .catalog-search kbd {
    display: none;
  }
  .catalog-toolbar {
    gap: 14px;
  }
  .catalog-formats {
    gap: 16px;
  }
}
@media (max-width: 600px) {
  .catalog-heading {
    gap: 12px;
    margin-bottom: 20px;
    align-items: flex-start;
  }
  .catalog-heading h1 {
    font-size: 23px;
  }
  .catalog-overview .catalog-heading h2 {
    font-size: 21px;
  }
  .catalog-refresh {
    padding-top: 5px;
  }
  .catalog-refresh > span {
    display: none;
  }
  .catalog-refresh svg {
    width: 18px;
    height: 18px;
  }
  .catalog-refresh {
    width: 36px;
    height: 36px;
    justify-content: center;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: white;
  }
  .catalog-toolbar {
    flex-wrap: wrap;
    padding: 12px;
    gap: 14px;
  }
  .catalog-search {
    flex-basis: 100%;
  }
  .catalog-search input {
    font-size: 12px;
  }
  .catalog-availability {
    font-size: 11px;
    min-height: 32px;
  }
  .catalog-view {
    margin-left: auto;
  }
  .catalog-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0 12px;
  }
  .catalog-formats {
    gap: 18px;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: thin;
  }
  .catalog-formats button {
    white-space: nowrap;
    min-height: 48px;
    font-size: 10px;
  }
  .catalog-result-count {
    padding: 4px 0 12px;
  }
  .catalog-grid {
    grid-template-columns: 1fr;
  }
  .catalog-note p {
    font-size: 10px;
  }
}
</style>
