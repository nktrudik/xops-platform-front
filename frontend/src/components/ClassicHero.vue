<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import AppIcon from './AppIcon.vue'
import LiquidRibbon from './LiquidRibbon.vue'

const query = defineModel<string>({ required: true })
const emit = defineEmits<{ submit: [] }>()
const hero = useTemplateRef<HTMLElement>('hero')
const search = useTemplateRef<HTMLInputElement>('search')
const searchFocused = shallowRef(false)

function focusSearch(event: KeyboardEvent): void {
  const target = event.target
  if (
    event.key !== '/' ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    (target instanceof HTMLElement &&
      target.closest('input, textarea, select, [contenteditable="true"]'))
  )
    return
  event.preventDefault()
  search.value?.focus()
}
function clearSearch(): void {
  query.value = ''
  search.value?.focus()
}
onMounted(() => window.addEventListener('keydown', focusSearch))
onBeforeUnmount(() => window.removeEventListener('keydown', focusSearch))
</script>

<template>
  <section ref="hero" class="hero" aria-labelledby="hero-title">
    <div class="hero-content">
      <div class="hero-eyebrow">
        <span class="eyebrow-line" aria-hidden="true" />Единое пространство AI Copilot
      </div>
      <h1 id="hero-title" class="hero-title">Ваши задачи.<br /><span>Возможности AI.</span></h1>
      <p class="hero-description">
        Находите своего AI-помощника и переходите к делу.<br class="desktop-break" />
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
            ref="search"
            v-model="query"
            name="q"
            type="search"
            autocomplete="off"
            placeholder="Название или задача…"
            aria-describedby="search-hint"
            aria-controls="catalog"
            aria-keyshortcuts="/"
            @keydown.esc="clearSearch"
          />
          <button
            v-if="query"
            class="icon-button search-clear"
            type="button"
            aria-label="Очистить поиск"
            @click="clearSearch"
          >
            <AppIcon name="close" />
          </button>
          <kbd v-else class="search-shortcut" aria-hidden="true">/</kbd>
        </div>
        <button class="button button-primary search-submit" type="submit" aria-label="Найти">
          <span>Найти</span><AppIcon name="arrow" />
        </button>
      </form>
      <p id="search-hint" class="search-hint">Поиск по названию и описанию Copilot</p>
    </div>
    <LiquidRibbon :host="hero" :engaged="searchFocused || Boolean(query)" />
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  min-height: 372px;
  margin-top: 28px;
  padding: 30px 44px;
  border: 1px solid #eee8ec;
  border-radius: var(--radius-lg);
  background: #fcfafb;
}
.hero-content {
  position: relative;
  z-index: 1;
  width: 62%;
  max-width: 760px;
}
.hero-content > * {
  animation: hero-arrive var(--motion-enter) var(--ease-out) both;
}
.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
}
.eyebrow-line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
  background: var(--red);
}
.hero-title {
  margin: 20px 0 16px;
  font-size: clamp(32px, 3.05vw, 44px);
  line-height: 1.15;
  letter-spacing: -1.5px;
  animation-delay: 60ms;
}
.hero-title > span {
  color: var(--red);
}
.hero-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.6;
  animation-delay: 120ms;
}
.search-form {
  display: flex;
  gap: 6px;
  margin-top: 24px;
  padding: 5px;
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  background: var(--white);
  box-shadow: 0 4px 16px #29233504;
  transition:
    border-color var(--motion-ui),
    box-shadow var(--motion-ui);
  animation-delay: 180ms;
}
.search-form:focus-within {
  border-color: var(--red);
  box-shadow:
    0 0 0 4px #e306110b,
    0 8px 24px #29233506;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding-left: 12px;
}
.search-input-wrap > svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--muted);
  transition: color var(--motion-ui);
}
.search-form:focus-within .search-input-wrap > svg {
  color: var(--red);
}
input {
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
}
input::placeholder {
  color: var(--muted);
  opacity: 1;
}
input::-webkit-search-cancel-button {
  display: none;
}
.search-submit {
  gap: 10px;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
}
.search-submit svg {
  width: 20px;
  height: 20px;
  transition: transform var(--motion-ui) var(--ease-out);
}
.search-submit:hover svg {
  transform: translateX(3px);
}
.search-shortcut {
  margin-right: 10px;
  padding: 2px 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--muted);
  font: 12px/1.4 var(--font-body);
}
.search-clear {
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border-radius: 6px;
}
.search-clear svg {
  width: 16px;
  height: 16px;
}
.search-hint {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  animation-delay: 220ms;
}
@keyframes hero-arrive {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 1100px) {
  .hero {
    padding: 32px;
  }
  .hero-content {
    width: 63%;
  }
  .hero-title {
    font-size: 34px;
    letter-spacing: -1px;
  }
  .hero-description {
    font-size: 15px;
  }
  .desktop-break {
    display: none;
  }
}
@media (max-width: 760px) {
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-height: auto;
    padding: 28px;
  }
  .hero-content {
    display: contents;
  }
  .hero-title {
    font-size: 34px;
  }
  .hero-description {
    max-width: 42ch;
  }
  .hero > .liquid-ribbon {
    grid-row: 4;
  }
  .search-form {
    grid-row: 5;
    margin-top: 8px;
  }
  .search-hint {
    grid-row: 6;
  }
}
@media (max-width: 640px) {
  .hero {
    margin-top: 20px;
    padding: 24px 20px;
    border-radius: 20px;
  }
  .hero-eyebrow {
    font-size: 11px;
    gap: 8px;
  }
  .eyebrow-line {
    width: 12px;
  }
  .hero-title {
    margin-top: 24px;
    font-size: clamp(24px, 7.3vw, 32px);
    letter-spacing: -0.8px;
  }
  .hero-description {
    max-width: none;
    font-size: 14px;
  }
  .search-form {
    margin-top: 8px;
  }
  input {
    font-size: 16px;
    height: 44px;
  }
  .search-input-wrap {
    gap: 8px;
    padding-left: 8px;
  }
  .search-shortcut,
  .search-submit > span {
    display: none;
  }
  .search-submit {
    width: 44px;
    padding: 10px;
  }
  .search-hint {
    font-size: 10px;
  }
}
</style>
