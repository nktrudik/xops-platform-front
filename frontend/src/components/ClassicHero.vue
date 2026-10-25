<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import AppIcon from './AppIcon.vue'
import LiquidRibbon from './LiquidRibbon.vue'

const query = defineModel<string>({ required: true })
const emit = defineEmits<{ submit: [] }>()
const hero = useTemplateRef<HTMLElement>('hero')
const searchFocused = shallowRef(false)
</script>

<template>
  <section ref="hero" class="hero" aria-labelledby="hero-title">
    <div class="hero-eyebrow"><span class="eyebrow-dot" /> Единое пространство AI Copilot</div>
    <h1 id="hero-title">
      Помощники для ваших<br class="desktop-break" />
      рабочих задач
    </h1>
    <p class="hero-description">
      Находите нужный Copilot и работайте с ним в одном пространстве.<br class="desktop-break" />
      От первого вопроса до готового решения.
    </p>
    <form
      class="search-form"
      role="search"
      @submit.prevent="emit('submit')"
      @focusin="searchFocused = true"
      @focusout="searchFocused = false"
    >
      <div class="search-input-wrap">
        <AppIcon name="search" />
        <label class="sr-only" for="copilot-search">Поиск Copilot</label>
        <input
          id="copilot-search"
          v-model="query"
          name="q"
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
    <LiquidRibbon :host="hero" :engaged="searchFocused || Boolean(query)" />
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  margin-top: 40px;
  padding: 52px 56px 48px;
  border-radius: 32px;
  background: #f6f2f8;
  isolation: isolate;
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
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.search-input-wrap:focus-within {
  border-color: var(--red);
  box-shadow: 0 0 0 4px rgb(227 6 17 / 7%);
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

@media (max-width: 1100px) {
  .hero {
    padding: 40px;
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
}
</style>
