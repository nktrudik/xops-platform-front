<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const { state, error = '' } = defineProps<{
  state: 'loading' | 'error' | 'empty' | 'no-results'
  error?: string
}>()
const emit = defineEmits<{ retry: []; reset: [] }>()
const content = computed(() => {
  if (state === 'error')
    return { title: 'Каталог недоступен', description: error, icon: 'alert' as const }
  if (state === 'no-results')
    return {
      title: 'Ничего не найдено',
      description: 'Попробуйте другое название, описание задачи или формат.',
      icon: 'search' as const,
    }
  return {
    title: 'В каталоге пока нет Copilot',
    description: 'Помощники появятся здесь после подключения к платформе.',
    icon: 'grid' as const,
  }
})
</script>

<template>
  <div v-if="state === 'loading'" class="catalog-skeletons" role="status" aria-busy="true">
    <span class="sr-only">Загружаем каталог…</span>
    <div v-for="item in 3" :key="item" class="skeleton-card" aria-hidden="true">
      <span class="skeleton-icon" /><span class="skeleton-line skeleton-title" />
      <span class="skeleton-line" /><span class="skeleton-line skeleton-short" />
      <span class="skeleton-footer" />
    </div>
  </div>
  <section v-else class="catalog-state state-panel surface" role="status">
    <span class="state-icon"><AppIcon :name="content.icon" /></span>
    <div class="state-copy">
      <h3 class="state-title">{{ content.title }}</h3>
      <p class="state-description">{{ content.description }}</p>
    </div>
    <button v-if="state === 'error'" class="button button-primary" @click="emit('retry')">
      <AppIcon name="refresh" />Повторить попытку
    </button>
    <button
      v-else-if="state === 'no-results'"
      class="button button-secondary"
      @click="emit('reset')"
    >
      Сбросить фильтры<AppIcon name="arrow" />
    </button>
  </section>
</template>

<style scoped>
.catalog-state {
  min-height: 248px;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.state-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text-secondary);
}
.state-title {
  margin: 0 0 8px;
  font-size: 19px;
  letter-spacing: -0.4px;
}
.state-description {
  margin: 0;
  max-width: 56ch;
  font-size: 14px;
  line-height: 1.6;
}
.catalog-state .button {
  min-height: 44px;
  padding: 10px 16px;
  font-size: 13px;
  border-radius: var(--radius-sm);
}
.catalog-state .button svg {
  width: 18px;
  height: 18px;
}
.catalog-skeletons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.skeleton-card {
  display: flex;
  flex-direction: column;
  min-height: 264px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--white);
}
.skeleton-card > span {
  display: block;
  border-radius: 6px;
  background: var(--surface-soft);
  animation: skeleton-pulse 1.4s ease-in-out 3;
}
.skeleton-icon {
  width: 46px;
  height: 46px;
  margin-bottom: 24px;
}
.skeleton-line {
  width: 90%;
  height: 12px;
  margin-bottom: 10px;
}
.skeleton-title {
  width: 65%;
  height: 20px;
  margin-bottom: 20px;
}
.skeleton-short {
  width: 55%;
}
.skeleton-footer {
  width: 100%;
  height: 32px;
  margin-top: auto;
}
@keyframes skeleton-pulse {
  50% {
    opacity: 0.45;
  }
}
@media (max-width: 1180px) {
  .catalog-skeletons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .skeleton-card:last-child {
    display: none;
  }
}
@media (max-width: 640px) {
  .catalog-state {
    padding: 24px 20px;
  }
  .catalog-skeletons {
    grid-template-columns: 1fr;
  }
  .skeleton-card:nth-child(2) {
    display: none;
  }
}
</style>
