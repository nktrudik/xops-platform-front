<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { interfaceLabels, statusLabels, type Copilot } from '../domain/copilot'
import AppIcon from './AppIcon.vue'
import StatusBadge from './StatusBadge.vue'

const { copilot } = defineProps<{ copilot: Copilot }>()
const canOpen = computed(
  () => copilot.status === 'available' || copilot.status === 'configuration-error',
)
const formatHint = computed(() => {
  if (copilot.interfaceType === 'chat') return 'С историей диалогов'
  if (copilot.interfaceType === 'embedded') return 'Внутри платформы'
  if (copilot.interfaceType === 'external') return 'В отдельной вкладке'
  return 'Проверьте настройки'
})
const formatIcon = computed(() => {
  if (copilot.interfaceType === 'chat') return 'chat'
  if (copilot.interfaceType === 'external') return 'external'
  return 'layers'
})
</script>

<template>
  <article
    class="copilot-card surface"
    :class="{ 'card-unavailable': copilot.status !== 'available' }"
  >
    <svg class="card-flourish" viewBox="0 0 180 100" fill="none" aria-hidden="true">
      <path
        pathLength="1"
        d="M-12 87C30 77 45 10 89 17C133 24 100 88 144 78C167 73 175 41 194 28"
      />
      <path
        pathLength="1"
        d="M-10 97C36 83 51 23 90 27C127 31 108 98 151 87C171 82 184 53 197 44"
      />
    </svg>
    <div class="card-heading">
      <span class="card-icon"><AppIcon :name="copilot.icon" /></span>
      <StatusBadge :status="copilot.status" />
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ copilot.name }}</h3>
      <p class="card-description">{{ copilot.description }}</p>
    </div>
    <div class="card-bottom">
      <div class="card-format">
        <span class="interface-label"
          ><AppIcon :name="formatIcon" />{{
            copilot.interfaceType ? interfaceLabels[copilot.interfaceType] : 'Интерфейс не настроен'
          }}</span
        >
        <span class="format-hint">{{ formatHint }}</span>
      </div>
      <RouterLink
        v-if="canOpen"
        class="card-open"
        :to="{ name: 'copilot', params: { id: copilot.id } }"
        :aria-label="`Открыть ${copilot.name}`"
        >Открыть<AppIcon name="arrow"
      /></RouterLink>
      <span v-else class="unavailable-label">{{
        copilot.status === 'coming-soon' ? 'Скоро на платформе' : statusLabels[copilot.status]
      }}</span>
    </div>
  </article>
</template>

<style scoped>
.copilot-card {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 252px;
  padding: 24px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--surface-elevated) 50%, #f2f2f5);
  box-shadow: var(--shadow-rest);
  transition:
    transform var(--motion-ui) var(--ease-out),
    border-color var(--motion-ui),
    box-shadow var(--motion-ui),
    background var(--motion-ui);
}
.card-flourish {
  position: absolute;
  z-index: -1;
  top: 12px;
  right: 20px;
  width: 140px;
  height: 64px;
  stroke: var(--red);
  stroke-width: 1.2;
  opacity: 0.28;
  transition:
    transform var(--motion-enter) var(--ease-out),
    opacity var(--motion-ui);
}
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border: 1px solid var(--graphite);
  border-radius: 13px;
  background: var(--graphite);
  color: var(--white);
  box-shadow: 0 4px 8px #20202712;
  transition:
    background var(--motion-ui),
    border-color var(--motion-ui);
}
.card-icon::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 11px;
  right: 11px;
  height: 3px;
  background: var(--red);
}
.card-icon svg {
  width: 24px;
  height: 24px;
}
.card-content {
  flex: 1;
  margin-block: 16px 20px;
}
.card-title {
  margin: 0 0 10px;
  font-size: 21px;
  line-height: 1.3;
  letter-spacing: -0.5px;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
.card-description {
  margin: 0;
  max-width: 62ch;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0 -24px -24px;
  padding: 16px 24px;
  border-top: 1px solid var(--graphite);
  border-radius: 0 0 15px 15px;
  background: var(--graphite);
  color: var(--on-selected);
}
.card-format {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.interface-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
}
.interface-label svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #d2d2db;
}
.format-hint {
  padding-left: 22px;
  color: #c2c2cd;
  font-size: 11px;
}
.card-open {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--white);
  background: var(--white);
  color: var(--graphite);
  font-size: 12px;
  font-weight: 500;
  transition:
    background var(--motion-ui),
    border-color var(--motion-ui),
    box-shadow var(--motion-ui);
}
.card-open::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
}
.card-open svg {
  width: 17px;
  height: 17px;
  transition: transform var(--motion-ui) var(--ease-out);
}
.copilot-card:has(.card-open:focus-visible) {
  outline: 3px solid var(--focus);
  outline-offset: 4px;
  border-color: var(--red);
  box-shadow: var(--shadow-hover);
}
.card-open:focus-visible {
  outline: none;
  border-color: var(--red);
  background: var(--red);
  color: white;
}
.unavailable-label {
  color: var(--text-secondary);
  font-size: 11px;
}
.card-unavailable {
  box-shadow: none;
  background: #fcfcfd;
}
.card-unavailable .card-icon {
  border-color: var(--border);
  color: var(--text-secondary);
  background: var(--surface-soft);
}
.card-unavailable .card-bottom {
  background: var(--surface-platinum);
  border-color: var(--border-strong);
  color: var(--text);
}
.card-unavailable .format-hint,
.card-unavailable .interface-label svg {
  color: var(--text-secondary);
}
.card-unavailable .card-icon::after {
  display: none;
}
.card-unavailable .card-flourish {
  display: none;
}
@media (hover: hover) {
  .copilot-card:has(.card-open):hover {
    transform: translateY(-4px);
    border-color: var(--red);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-hover);
  }
  .copilot-card:has(.card-open):hover .card-flourish {
    opacity: 0.65;
    transform: translate(-6px, -3px);
  }
  .copilot-card:has(.card-open):hover .card-icon {
    border-color: var(--red);
    background: var(--red);
  }
  .copilot-card:has(.card-open):hover .card-flourish path {
    animation: trace-line 650ms var(--ease-out) both;
  }
  .copilot-card:has(.card-open):hover .card-flourish path + path {
    animation-delay: 70ms;
  }
  .copilot-card:has(.card-open):hover .card-open {
    background: var(--red);
    border-color: var(--red);
    color: white;
    box-shadow: 0 3px 12px #e306113d;
  }
  .copilot-card:has(.card-open):hover .card-open svg {
    transform: translateX(3px);
  }
}
@keyframes trace-line {
  from {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }
  to {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
  }
}
.copilot-card:has(.card-open:active) {
  transform: translateY(-1px) scale(0.992);
}
@media (max-width: 640px) {
  .copilot-card {
    min-height: 256px;
    padding: 20px;
  }
  .card-bottom {
    margin: 0 -20px -20px;
    padding: 16px 20px;
  }
  .card-title {
    font-size: 20px;
  }
  .card-content {
    margin-block: 18px 24px;
  }
  .card-open {
    min-height: 44px;
  }
}
</style>
