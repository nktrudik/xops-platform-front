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
    :data-format="copilot.interfaceType"
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
        >Открыть<span class="card-action-icon"><AppIcon name="arrow" /></span
      ></RouterLink>
      <span v-else class="unavailable-label">{{
        copilot.status === 'coming-soon' ? 'Скоро на платформе' : statusLabels[copilot.status]
      }}</span>
    </div>
  </article>
</template>

<style scoped>
.copilot-card {
  position: relative;
  overflow: hidden;
  padding: 22px;
  min-height: 268px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition:
    transform 220ms,
    border-color 180ms,
    box-shadow 180ms;
}
.copilot-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--red);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.copilot-card:has(.card-open):is(:hover, :focus-within)::before {
  transform: scaleY(1);
}
.copilot-card:has(.card-open):hover {
  transform: translateY(-4px);
  border-color: #d7afb4;
  box-shadow: 0 10px 28px rgb(35 23 28 / 8%);
}
.copilot-card:has(.card-open):active {
  transform: translateY(-1px) scale(0.993);
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
  background: #fcebed;
  color: var(--red);
}
.copilot-card[data-format='embedded'] .icon-tile {
  background: #292a30;
  color: white;
}
.copilot-card[data-format='external'] .icon-tile {
  background: #eceff4;
  color: #555c69;
}
.card-heading .icon-tile svg {
  width: 21px;
  height: 21px;
}
.copilot-card h3 {
  font-size: 18px;
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
  color: #353944;
  font-size: 11px;
  font-weight: 500;
  padding: 6px 0 6px 6px;
}
.card-action-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #dfe2e8;
  border-radius: 50%;
  transition:
    background 200ms,
    border-color 200ms,
    transform 200ms;
}
.card-action-icon > svg {
  width: 16px;
  height: 16px;
  transition: transform 180ms;
}
.copilot-card:has(.card-open):is(:hover, :focus-within) .card-action-icon {
  background: var(--red);
  color: white;
  border-color: var(--red);
  transform: rotate(-35deg);
}
.card-open:hover {
  color: var(--red);
}
.card-open:hover .card-action-icon > svg {
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
.catalog-list .copilot-card {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(200px, 1.4fr) minmax(180px, 0.8fr);
  align-items: center;
  gap: 12px 24px;
  min-height: 0;
  padding: 20px 24px;
}
.catalog-list .card-heading {
  grid-column: 1;
  grid-row: 1;
  justify-content: flex-start;
}
.catalog-list .copilot-card h3 {
  grid-column: 1;
  grid-row: 2;
  margin: 0;
  font-size: 15px;
}
.catalog-list .copilot-card p {
  grid-column: 2;
  grid-row: 1 / 3;
  margin: 0;
  font-size: 12px;
}
.catalog-list .card-bottom {
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
  .catalog-list .copilot-card {
    grid-template-columns: minmax(180px, 1fr) minmax(160px, 1fr);
  }
  .catalog-list .copilot-card p {
    grid-column: 1 / 3;
    grid-row: 3;
    margin-top: 4px;
  }
  .catalog-list .card-bottom {
    grid-column: 2;
  }
}
@media (max-width: 600px) {
  .copilot-card {
    min-height: 244px;
    padding: 20px;
  }
  .catalog-list .copilot-card {
    padding: 20px;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) 100px;
  }
  .catalog-list .card-heading {
    grid-column: 1 / 3;
  }
  .catalog-list .copilot-card h3 {
    grid-column: 1 / 3;
    grid-row: 2;
  }
  .catalog-list .copilot-card p {
    grid-column: 1 / 3;
    grid-row: 3;
  }
  .catalog-list .card-bottom {
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
