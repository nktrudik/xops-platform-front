<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { interfaceLabels, statusLabels, type Copilot } from '../domain/copilot'
import AppIcon from './AppIcon.vue'
import StatusBadge from './StatusBadge.vue'
defineProps<{ copilot: Copilot }>()
</script>

<template>
  <article
    class="copilot-card surface"
    :class="{ 'card-unavailable': copilot.status !== 'available' }"
  >
    <div class="card-heading">
      <span class="icon-tile"><AppIcon :name="copilot.icon" /></span>
      <StatusBadge :status="copilot.status" />
    </div>
    <h3>{{ copilot.name }}</h3>
    <p>{{ copilot.description }}</p>
    <div class="card-bottom">
      <span class="interface-label"
        ><AppIcon
          :name="
            copilot.interfaceType === 'chat'
              ? 'chat'
              : copilot.interfaceType === 'external'
                ? 'external'
                : 'layers'
          "
        />{{
          copilot.interfaceType ? interfaceLabels[copilot.interfaceType] : 'Интерфейс не настроен'
        }}</span
      >
      <RouterLink
        v-if="copilot.status === 'available' || copilot.status === 'configuration-error'"
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
  padding: 22px;
  min-height: 258px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition:
    transform 180ms,
    border-color 180ms,
    box-shadow 180ms;
}
.copilot-card:has(.card-open):hover {
  transform: translateY(-2px);
  border-color: #bbc1ca;
  box-shadow: 0 4px 16px rgb(20 25 35 / 4%);
}
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-heading .icon-tile {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: #f1f3f6;
  color: #525b69;
}
.card-heading .icon-tile svg {
  width: 21px;
  height: 21px;
}
.copilot-card h3 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.35px;
  line-height: 1.4;
  margin: 20px 0 10px;
  overflow-wrap: anywhere;
}
.copilot-card p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
  margin: 0 0 24px;
  overflow-wrap: anywhere;
}
.card-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #eff1f4;
}
.interface-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-secondary);
}
.interface-label svg {
  width: 14px;
  height: 14px;
}
.card-open {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 11px;
  font-weight: 500;
  padding: 6px 0 6px 6px;
}
.card-open > svg {
  width: 16px;
  height: 16px;
  transition: transform 180ms;
}
.card-open:hover {
  color: var(--red);
}
.card-open:hover > svg {
  transform: translateX(3px);
}
.unavailable-label {
  font-size: 10px;
  color: var(--text-secondary);
}
.card-unavailable {
  background: #fbfcfd;
}
.card-unavailable .icon-tile {
  color: #858c96;
  background: #eff1f4;
}
:global(.catalog-list) .copilot-card {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(200px, 1.4fr) minmax(180px, 0.8fr);
  align-items: center;
  gap: 12px 24px;
  min-height: 0;
  padding: 20px 24px;
}
:global(.catalog-list) .card-heading {
  grid-column: 1;
  grid-row: 1;
  justify-content: flex-start;
}
:global(.catalog-list) .copilot-card h3 {
  grid-column: 1;
  grid-row: 2;
  margin: 0;
  font-size: 15px;
}
:global(.catalog-list) .copilot-card p {
  grid-column: 2;
  grid-row: 1 / 3;
  margin: 0;
  font-size: 12px;
}
:global(.catalog-list) .card-bottom {
  grid-column: 3;
  grid-row: 1 / 3;
  display: grid;
  justify-items: end;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}
@media (max-width: 1200px) {
  :global(.catalog-list) .copilot-card {
    grid-template-columns: minmax(180px, 1fr) minmax(160px, 1fr);
  }
  :global(.catalog-list) .copilot-card p {
    grid-column: 1 / 3;
    grid-row: 3;
    margin-top: 4px;
  }
  :global(.catalog-list) .card-bottom {
    grid-column: 2;
  }
}
@media (max-width: 600px) {
  .copilot-card {
    min-height: 244px;
    padding: 20px;
  }
  :global(.catalog-list) .copilot-card {
    padding: 20px;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) 100px;
  }
  :global(.catalog-list) .card-heading {
    grid-column: 1 / 3;
  }
  :global(.catalog-list) .copilot-card h3 {
    grid-column: 1 / 3;
    grid-row: 2;
  }
  :global(.catalog-list) .copilot-card p {
    grid-column: 1 / 3;
    grid-row: 3;
  }
  :global(.catalog-list) .card-bottom {
    grid-column: 1 / 3;
    grid-row: 4;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: 4px;
  }
}
</style>
