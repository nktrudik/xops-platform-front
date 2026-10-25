<script setup lang="ts">
import { usePlatform } from '../app/context'
import { useCatalogControls, type CatalogFormat } from '../composables/use-catalog-controls'
import CatalogHero from '../components/CatalogHero.vue'
import CopilotCollection from '../components/CopilotCollection.vue'
import CatalogSkeleton from '../components/CatalogSkeleton.vue'
import AppIcon from '../components/AppIcon.vue'
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
  <div class="catalog-workspace">
    <CatalogHero
      v-model="query"
      :copilots="copilots"
      :loading="loading"
      :has-loaded="hasLoaded"
      :overview="!!overview"
      @submit="focusResults"
    />
    <section id="catalog" class="catalog-section" aria-labelledby="catalog-title">
      <div class="catalog-heading">
        <div>
          <h2 id="catalog-title" tabindex="-1">
            Инструменты для ваших задач<span v-if="hasLoaded" class="catalog-total">{{
              copilots.length
            }}</span>
          </h2>
          <p>Помощники команд МТС для ваших рабочих задач.</p>
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
      <div class="catalog-controls">
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
        <div class="catalog-controls-right">
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
      </div>
      <div class="catalog-results-meta">
        <span aria-live="polite">{{
          hasLoaded ? `${results.length} из ${copilots.length} Copilot` : 'Подключаем инструменты…'
        }}</span
        ><span class="catalog-live"><i />Обновляется автоматически</span>
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
      <CopilotCollection v-else :copilots="results" :list-view="listView" />
      <CatalogNotice />
      <div class="catalog-note">
        <span class="catalog-note-icon"><AppIcon name="sparkles" /></span>
        <div>
          <b>У каждой задачи — свой Copilot.</b>
          <p>
            Выбирайте формат, который подходит вам: диалог, встроенное приложение или внешний
            продукт.
          </p>
        </div>
        <span class="catalog-note-mark" aria-hidden="true">XOps</span>
      </div>
    </section>
  </div>
</template>
<style scoped>
.catalog-section {
  margin-top: 24px;
  scroll-margin-top: 100px;
}
.catalog-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  animation: catalog-section-arrive 450ms 70ms var(--ease-out) backwards;
}
.catalog-heading h2 {
  font-size: 23px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.6px;
  margin: 0 0 6px;
}
.catalog-total {
  display: inline-block;
  vertical-align: middle;
  margin-left: 12px;
  padding: 4px 7px;
  font: 500 12px/1.2 var(--font-body);
  color: white;
  background: var(--red);
  border-radius: 4px;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.catalog-heading p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}
.catalog-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 12px;
  background: white;
  color: #3e4552;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 12px;
  white-space: nowrap;
  transition:
    border-color 180ms,
    color 180ms,
    transform 150ms;
}
.catalog-refresh > svg {
  width: 14px;
  height: 14px;
  transition: transform 300ms;
}
.catalog-refresh:hover {
  color: var(--red);
  border-color: #edc0c4;
}
.catalog-refresh:hover > svg {
  transform: rotate(45deg);
}
.catalog-refresh:active {
  transform: scale(0.97);
}
.catalog-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 10px;
  background: #e9ecf1;
  border: 1px solid #d4d9e2;
  border-radius: 10px;
  animation: catalog-section-arrive 450ms 120ms var(--ease-out) backwards;
}
.catalog-formats {
  display: flex;
  align-items: center;
  gap: 4px;
}
.catalog-formats button {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  color: #555c68;
  font-size: 12px;
  white-space: nowrap;
  transition:
    background 180ms,
    color 180ms,
    transform 150ms,
    box-shadow 180ms;
}
.catalog-formats button > span {
  display: grid;
  place-items: center;
  min-width: 16px;
  padding: 2px 4px;
  font-size: 10px;
  border-radius: 3px;
  color: #656c78;
  background: #dfe3e9;
  font-variant-numeric: tabular-nums;
}
.catalog-formats button:hover {
  background: #e1e4e9;
  color: var(--text);
}
.catalog-formats button:active {
  transform: scale(0.96);
}
.catalog-formats button[aria-pressed='true'] {
  background: var(--graphite);
  border-color: var(--graphite);
  color: #fff;
  box-shadow: 0 2px 5px rgb(20 24 32 / 12%);
}
.catalog-formats button[aria-pressed='true'] > span {
  color: white;
  background: var(--red);
}
.catalog-controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.catalog-availability {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  color: #555c68;
}
.catalog-availability input {
  appearance: auto;
  accent-color: var(--red);
  width: 15px;
  height: 15px;
  margin: 0;
}
.catalog-view {
  display: flex;
  padding-left: 10px;
  border-left: 1px solid #d5d9e1;
  gap: 4px;
}
.catalog-view .icon-button {
  width: 34px;
  height: 34px;
  padding: 8px;
  border-radius: 5px;
}
.catalog-view .icon-button svg {
  width: 16px;
  height: 16px;
}
.catalog-view button[aria-pressed='true'] {
  background: var(--red);
  color: #fff;
}
.catalog-results-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0;
  color: #626a77;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.catalog-live {
  display: flex;
  align-items: center;
  gap: 6px;
}
.catalog-live i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #8b929d;
}
.catalog-note {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 24px;
  margin-top: 24px;
  border: 1px solid #dde0e6;
  border-radius: 12px;
  background: #edf0f4;
}
.catalog-note-icon {
  color: var(--red);
  flex-shrink: 0;
}
.catalog-note-icon svg {
  width: 25px;
  height: 25px;
}
.catalog-note b {
  font-size: 12px;
  font-weight: 500;
}
.catalog-note p {
  color: var(--text-secondary);
  font-size: 11px;
  margin: 6px 0 0;
  line-height: 1.7;
}
.catalog-note-mark {
  font: 500 22px var(--font-heading);
  color: #a6acb6;
  margin-left: auto;
  letter-spacing: -1px;
}
@media (max-width: 1250px) {
  .catalog-controls {
    gap: 12px;
  }
  .catalog-controls-right {
    gap: 10px;
  }
  .catalog-formats button {
    padding-inline: 9px;
    font-size: 11px;
  }
  .catalog-availability {
    font-size: 11px;
  }
}
@media (max-width: 1050px) and (min-width: 801px) {
  .catalog-controls {
    flex-wrap: wrap;
  }
  .catalog-controls-right {
    width: 100%;
    justify-content: space-between;
    border-top: 1px solid #d9dde4;
    padding-top: 10px;
  }
}
@media (max-width: 700px) {
  .catalog-section {
    margin-top: 28px;
  }
  .catalog-heading {
    gap: 12px;
    margin-bottom: 20px;
    align-items: flex-start;
  }
  .catalog-heading h2 {
    font-size: 21px;
    max-width: 260px;
  }
  .catalog-heading p {
    font-size: 13px;
    max-width: 270px;
  }
  .catalog-refresh {
    margin-top: 2px;
    width: 34px;
    height: 34px;
    padding: 9px;
    min-height: 34px;
  }
  .catalog-refresh span {
    display: none;
  }
  .catalog-controls {
    flex-wrap: wrap;
    padding: 8px;
    gap: 10px;
  }
  .catalog-formats {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }
  .catalog-formats button {
    padding-inline: 9px;
    font-size: 11px;
    min-height: 38px;
  }
  .catalog-controls-right {
    width: 100%;
    justify-content: space-between;
    border-top: 1px solid #d9dde4;
    padding-top: 8px;
  }
  .catalog-availability {
    font-size: 12px;
    min-height: 30px;
  }
  .catalog-results-meta {
    font-size: 11px;
  }
  .catalog-live {
    font-size: 10px;
  }
  .catalog-note {
    padding: 20px;
    align-items: flex-start;
  }
  .catalog-note b {
    font-size: 11px;
  }
  .catalog-note p {
    font-size: 10px;
  }
  .catalog-note-mark {
    display: none;
  }
}
@keyframes catalog-section-arrive {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
