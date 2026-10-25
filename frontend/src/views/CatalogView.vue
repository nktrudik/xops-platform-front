<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlatform } from '../app/context'
import { searchCopilots } from '../domain/copilot'
import ClassicHero from '../components/ClassicHero.vue'
import CopilotCard from '../components/CopilotCard.vue'
import StatePanel from '../components/StatePanel.vue'
import CatalogNotice from '../components/CatalogNotice.vue'

const { copilots, loading, error, hasLoaded, loadCatalog } = usePlatform()
const query = ref('')
const results = computed(() => searchCopilots(copilots.value, query.value))

function focusResults(): void {
  document.getElementById('catalog-title')?.focus({ preventScroll: true })
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <ClassicHero v-model="query" @submit="focusResults" />

  <section id="catalog" class="catalog-section" aria-labelledby="catalog-title">
    <div class="section-heading">
      <div>
        <span class="section-eyebrow">Инструменты платформы</span>
        <h2 id="catalog-title" tabindex="-1">Каталог Copilot</h2>
      </div>
      <span v-if="!loading && !error" class="catalog-count" aria-live="polite">{{
        query ? `Найдено: ${results.length}` : `${copilots.length} Copilot`
      }}</span>
    </div>
    <StatePanel v-if="loading" title="Загружаем каталог" loading />
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
      description="Попробуйте другое название или опишите задачу короче."
      ><button class="button button-secondary" @click="query = ''">
        Очистить поиск
      </button></StatePanel
    >
    <div v-else class="catalog-grid">
      <CopilotCard v-for="copilot in results" :key="copilot.id" :copilot="copilot" />
    </div>
    <CatalogNotice />
  </section>
</template>

<style scoped>
.catalog-section {
  margin-top: 52px;
  scroll-margin-top: 110px;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}
.section-eyebrow {
  color: var(--text-secondary);
  font-size: 13px;
}
h2 {
  font-size: clamp(25px, 2.5vw, 34px);
  margin: 8px 0 0;
  letter-spacing: -0.6px;
}
.catalog-count {
  white-space: nowrap;
  color: var(--text-secondary);
  background: var(--border);
  padding: 8px 14px;
  border-radius: 30px;
  font-size: 13px;
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 1100px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .catalog-section {
    margin-top: 36px;
  }
  .catalog-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .section-heading {
    align-items: center;
  }
}
</style>
