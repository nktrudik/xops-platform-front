<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlatform } from '../app/context'
import { searchCopilots } from '../domain/copilot'
import AppIcon from '../components/AppIcon.vue'
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
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-eyebrow"><span class="eyebrow-dot" /> Единое пространство AI Copilot</div>
    <h1 id="hero-title">
      Помощники для ваших<br class="desktop-break" />
      рабочих задач
    </h1>
    <p class="hero-description">
      Находите нужный Copilot и работайте с ним в одном пространстве.<br class="desktop-break" />
      От первого вопроса до готового решения.
    </p>
    <form class="search-form" role="search" @submit.prevent="focusResults">
      <div class="search-input-wrap">
        <AppIcon name="search" />
        <label class="sr-only" for="copilot-search">Поиск Copilot</label>
        <input
          id="copilot-search"
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="Название Copilot или ваша задача"
        />
        <button
          v-if="query"
          class="icon-button search-clear"
          type="button"
          aria-label="Очистить поиск"
          @click="query = ''"
        >
          <AppIcon name="close" />
        </button>
      </div>
      <button class="button button-primary" type="submit">Найти<AppIcon name="arrow" /></button>
    </form>
    <span class="hero-watermark" aria-hidden="true">X</span>
  </section>

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
.hero {
  position: relative;
  overflow: hidden;
  margin-top: 40px;
  padding: 52px 56px 48px;
  border-radius: 32px;
  background: linear-gradient(
    115deg,
    color-mix(in srgb, #913f98 10%, white),
    color-mix(in srgb, #0082c8 12%, white)
  );
}
.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  position: relative;
  z-index: 1;
  color: var(--text-secondary);
  font-size: 14px;
}
.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--red);
}
h1 {
  position: relative;
  z-index: 1;
  margin: 22px 0 18px;
  max-width: 1000px;
  font-size: clamp(30px, 3.3vw, 48px);
  line-height: 1.2;
  letter-spacing: -1.3px;
}
.hero-description {
  position: relative;
  z-index: 1;
  color: var(--text-secondary);
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
}
.hero-watermark {
  position: absolute;
  right: 46px;
  top: -52px;
  font-family: var(--font-heading);
  font-size: 390px;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(255 255 255 / 35%);
  pointer-events: none;
  transform: rotate(-9deg);
}
.search-form {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  max-width: 1100px;
  margin-top: 32px;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  background: white;
  border-radius: 14px;
  padding: 0 18px;
  min-width: 0;
  border: 1px solid transparent;
}
.search-input-wrap:focus-within {
  border-color: var(--text-secondary);
}
.search-input-wrap > svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}
input {
  height: 58px;
  width: 100%;
  border: 0;
  background: transparent;
  font-size: 16px;
  outline: none;
  padding: 0;
  min-width: 0;
}
input::-webkit-search-cancel-button {
  display: none;
}
.search-form .button {
  min-width: 150px;
}
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
  .hero {
    padding: 40px;
  }
  .hero-watermark {
    right: -60px;
  }
}
@media (max-width: 640px) {
  .hero {
    margin-top: 24px;
    padding: 28px 22px;
    border-radius: 24px;
  }
  .hero-description {
    font-size: 16px;
  }
  .desktop-break {
    display: none;
  }
  h1 {
    letter-spacing: -0.8px;
  }
  .search-form {
    flex-direction: column;
    margin-top: 24px;
  }
  .search-form .button {
    min-height: 50px;
  }
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
  .hero-watermark {
    font-size: 260px;
    right: -70px;
    top: 20px;
  }
}
</style>
