<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { usePlatform } from '../app/context'
import AppIcon from './AppIcon.vue'
const { copilots, hasLoaded } = usePlatform()
const statistics = computed(() => [
  {
    label: 'Copilot в каталоге',
    count: copilots.value.length,
    icon: 'grid' as const,
    detail: 'Все инструменты платформы',
  },
  {
    label: 'Готовы к работе',
    count: copilots.value.filter((item) => item.status === 'available').length,
    icon: 'check' as const,
    detail: 'Доступные прямо сейчас',
  },
  {
    label: 'Форматы взаимодействия',
    count: new Set(copilots.value.map((item) => item.interfaceType).filter(Boolean)).size,
    icon: 'layers' as const,
    detail: 'Чат, приложения и продукты',
  },
])
</script>
<template>
  <section class="workspace-overview" aria-labelledby="overview-title">
    <div class="overview-heading">
      <div>
        <span class="section-eyebrow">Ваше рабочее пространство</span>
        <h1 id="overview-title">Работайте с AI. Решайте больше.</h1>
        <p>Находите нужные инструменты и переходите от задачи к результату.</p>
      </div>
      <RouterLink class="button overview-catalog-link" :to="{ name: 'catalog' }"
        >Открыть каталог<AppIcon name="arrow"
      /></RouterLink>
    </div>
    <div class="overview-statistics">
      <div v-for="statistic in statistics" :key="statistic.label" class="statistic">
        <span class="statistic-icon"><AppIcon :name="statistic.icon" /></span>
        <div>
          <span class="statistic-label">{{ statistic.label }}</span
          ><strong :class="{ 'statistic-loading': !hasLoaded }">{{
            hasLoaded ? statistic.count : '—'
          }}</strong
          ><small>{{ statistic.detail }}</small>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.workspace-overview {
  margin-bottom: 32px;
}
.overview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}
.overview-heading h1 {
  font-size: clamp(23px, 2vw, 29px);
  line-height: 1.35;
  letter-spacing: -0.9px;
  margin: 12px 0;
}
.overview-heading p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.overview-catalog-link {
  border-color: var(--border);
  background: white;
  font-size: 12px;
  white-space: nowrap;
}
.overview-catalog-link:hover {
  border-color: var(--muted);
}
.overview-catalog-link svg {
  width: 16px;
  height: 16px;
}
.overview-statistics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.statistic {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 24px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
}
.statistic-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fafbfc;
  color: #656c77;
  flex-shrink: 0;
}
.statistic-icon svg {
  width: 18px;
  height: 18px;
}
.statistic-label {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 11px;
  display: block;
  line-height: 1.5;
}
.statistic > div {
  min-width: 0;
}
.statistic strong {
  display: block;
  margin: 8px 0 6px;
  font: 500 29px/1 var(--font-heading);
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
}
.statistic small {
  display: block;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.5;
}
.statistic-loading {
  color: var(--muted);
}
@media (max-width: 1200px) {
  .statistic {
    padding: 20px;
    gap: 12px;
  }
  .statistic-icon {
    display: none;
  }
  .overview-catalog-link {
    display: none;
  }
}
@media (max-width: 600px) {
  .workspace-overview {
    margin-bottom: 28px;
  }
  .overview-heading {
    margin-bottom: 24px;
  }
  .overview-heading h1 {
    font-size: 25px;
    max-width: 340px;
  }
  .overview-heading p {
    font-size: 13px;
    max-width: 320px;
  }
  .overview-statistics {
    gap: 8px;
  }
  .statistic {
    padding: 14px 10px;
  }
  .statistic-label {
    font-size: 10px;
    min-height: 30px;
  }
  .statistic strong {
    font-size: 24px;
  }
  .statistic small {
    display: none;
  }
}
</style>
