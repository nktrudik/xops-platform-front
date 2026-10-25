<script setup lang="ts">
import { computed } from 'vue'
import type { Copilot } from '../domain/copilot'
import CatalogSignal from './CatalogSignal.vue'
import AppIcon from './AppIcon.vue'
const props = defineProps<{
  copilots: readonly Copilot[]
  loading: boolean
  hasLoaded: boolean
  overview: boolean
}>()
const query = defineModel<string>({ required: true })
const emit = defineEmits<{ submit: [] }>()
const available = computed(
  () => props.copilots.filter((item) => item.status === 'available').length,
)
const formats = computed(
  () => new Set(props.copilots.map((item) => item.interfaceType).filter(Boolean)).size,
)
</script>
<template>
  <section class="catalog-hero" aria-labelledby="catalog-hero-title">
    <div class="hero-signal-stripe" aria-hidden="true" />
    <div class="hero-content">
      <div class="hero-eyebrow">
        <span />XOps Signal<span class="hero-eyebrow-divider" />Ваше пространство AI
      </div>
      <h1 id="catalog-hero-title">
        {{ overview ? 'Ваши задачи. Возможности AI.' : 'Каталог Copilot' }}
      </h1>
      <p class="hero-copy">
        Найдите своего помощника.<br class="hero-mobile-break" />
        Освободите время для главного.
      </p>
      <form
        class="signal-search"
        :class="{ 'search-typing': !!query, 'search-loading': loading }"
        role="search"
        @submit.prevent="emit('submit')"
      >
        <AppIcon name="search" /><label class="sr-only" for="copilot-search">Поиск Copilot</label
        ><input
          id="copilot-search"
          v-model="query"
          type="search"
          name="q"
          autocomplete="off"
          placeholder="Название Copilot или ваша задача…"
          :aria-busy="loading"
        /><span v-if="loading" class="spinner" aria-hidden="true" /><button
          v-else-if="query"
          class="icon-button"
          type="button"
          aria-label="Очистить поиск"
          @click="query = ''"
        >
          <AppIcon name="close" /></button
        ><button class="search-submit" type="submit" aria-label="Найти Copilot">
          <AppIcon name="arrow" />
        </button>
      </form>
      <div class="hero-statistics" aria-live="polite">
        <span
          ><b>{{ hasLoaded ? copilots.length : '—' }}</b> Copilot в каталоге</span
        ><i /><span
          ><span class="hero-available-dot" /><b>{{ hasLoaded ? available : '—' }}</b> доступно
          сейчас</span
        ><i /><span
          >Форматов: <b>{{ hasLoaded ? formats : '—' }}</b></span
        >
      </div>
    </div>
    <CatalogSignal :copilots="copilots" :query="query" :loading="loading" />
  </section>
</template>
<style scoped>
.catalog-hero {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  min-height: 320px;
  padding: 24px 24px 24px 32px;
  background:
    radial-gradient(ellipse at 76% 10%, #42434e70, transparent 55%),
    linear-gradient(120deg, #202126, #292a33);
  border: 1px solid #4f505a;
  border-radius: 16px;
  color: #fff;
  overflow: clip;
  box-shadow:
    0 12px 28px rgb(30 32 40 / 12%),
    inset 0 1px 0 #ffffff0a;
}
.hero-signal-stripe {
  position: absolute;
  left: 0;
  top: 28px;
  bottom: 28px;
  width: 3px;
  background: var(--red);
  box-shadow: 0 0 20px rgb(227 6 17 / 30%);
}
.hero-content {
  min-width: 0;
  flex: 1;
  max-width: 760px;
  padding-block: 8px;
  animation: hero-arrive 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  color: #d0d0da;
}
.hero-eyebrow > span:first-child {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ff424f;
}
.hero-eyebrow-divider {
  width: 1px;
  height: 10px;
  background: #60616a;
  margin-inline: 2px;
}
.hero-content h1 {
  font-size: clamp(28px, 2.3vw, 36px);
  line-height: 1.25;
  letter-spacing: -0.9px;
  font-weight: 500;
  margin: 18px 0 10px;
  max-width: 650px;
  text-wrap: balance;
}
.hero-copy {
  font-size: 14px;
  line-height: 1.6;
  color: #d4d4df;
  margin: 0 0 20px;
}
.hero-mobile-break {
  display: none;
}
.signal-search {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 620px;
  background: #fff;
  color: var(--text);
  padding: 6px 6px 6px 16px;
  border: 1px solid #e4e4e9;
  border-radius: 10px;
  transition:
    border-color 200ms,
    box-shadow 200ms,
    transform 200ms;
}
.signal-search:focus-within {
  border-color: #ff616b;
  box-shadow:
    0 0 0 4px rgb(227 6 17 / 24%),
    0 7px 24px #0000001f;
  transform: translateY(-2px);
}
.signal-search > svg {
  width: 18px;
  height: 18px;
  color: #737681;
  flex-shrink: 0;
}
.signal-search input {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: 0;
  padding: 0;
  background: none;
  font-size: 14px;
  color: var(--text);
}
.signal-search input:focus-visible {
  outline: none;
}
.signal-search input::placeholder {
  color: #777b85;
}
.signal-search input::-webkit-search-cancel-button {
  display: none;
}
.signal-search .icon-button {
  width: 26px;
  height: 30px;
  padding: 5px;
}
.signal-search .icon-button svg {
  width: 16px;
  height: 16px;
}
.search-submit {
  display: grid;
  place-items: center;
  width: 42px;
  height: 40px;
  border: 0;
  background: var(--red);
  color: white;
  border-radius: 6px;
  flex-shrink: 0;
  transition:
    background 160ms,
    transform 160ms;
}
.search-submit svg {
  width: 18px;
  height: 18px;
  transition: transform 180ms;
}
.search-submit:hover {
  background: var(--red-hover);
}
.search-submit:hover svg {
  transform: translateX(3px);
}
.search-submit:active {
  transform: scale(0.93);
}
.search-typing {
  border-color: #ff8c94;
}
.signal-search .spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.hero-statistics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: #cdced8;
  margin-top: 18px;
  font-size: 11px;
}
.hero-statistics > span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.hero-statistics b {
  color: #f1f1f5;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.hero-statistics > i {
  width: 1px;
  height: 10px;
  background: #565761;
}
.hero-available-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ff4f5a;
  margin-right: 3px;
}
@keyframes hero-arrive {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 1250px) {
  .catalog-hero {
    padding-inline: 24px 12px;
  }
  .hero-content h1 {
    font-size: 28px;
  }
}
@media (max-width: 1000px) and (min-width: 701px) {
  .hero-content h1 {
    font-size: 28px;
  }
  .hero-copy {
    font-size: 14px;
  }
  .hero-statistics {
    gap: 8px;
    font-size: 11px;
  }
  .hero-statistics > i:last-of-type,
  .hero-statistics > span:last-child {
    display: none;
  }
}
@media (max-width: 700px) {
  .catalog-hero {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 24px 20px 20px;
    border-radius: 14px;
  }
  .hero-content {
    max-width: none;
    padding: 0;
  }
  .hero-eyebrow {
    font-size: 9px;
    letter-spacing: 1px;
  }
  .hero-content h1 {
    font-size: 27px;
    line-height: 1.2;
    margin: 16px 0 20px;
    letter-spacing: -0.8px;
    max-width: 320px;
  }
  .hero-copy {
    display: none;
  }
  .hero-mobile-break {
    display: block;
  }
  .signal-search {
    gap: 8px;
  }
  .signal-search input {
    font-size: 12px;
  }
  .hero-statistics {
    gap: 8px;
    font-size: 10px;
    margin-top: 14px;
  }
  .hero-statistics > i:last-of-type,
  .hero-statistics > span:last-child {
    display: none;
  }
  .hero-signal-stripe {
    top: 26px;
    bottom: auto;
    height: 120px;
  }
}
</style>
