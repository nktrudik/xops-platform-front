<script setup lang="ts">
import type { Copilot } from '../domain/copilot'
import CopilotCard from './CopilotCard.vue'
defineProps<{ copilots: readonly Copilot[]; listView: boolean }>()

function freezeLeaving(element: Element): void {
  if (!(element instanceof HTMLElement)) return
  const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = element
  Object.assign(element.style, {
    left: `${offsetLeft}px`,
    top: `${offsetTop}px`,
    width: `${offsetWidth}px`,
    height: `${offsetHeight}px`,
  })
}
function clearPosition(element: Element): void {
  if (!(element instanceof HTMLElement)) return
  for (const property of ['left', 'top', 'width', 'height']) element.style.removeProperty(property)
}
</script>
<template>
  <TransitionGroup
    name="catalog-motion"
    tag="div"
    class="catalog-grid"
    :class="{ 'catalog-list': listView, 'catalog-large': copilots.length > 50 }"
    appear
    @before-leave="freezeLeaving"
    @before-enter="clearPosition"
    @after-leave="clearPosition"
    @leave-cancelled="clearPosition"
  >
    <div
      v-for="(copilot, index) in copilots"
      :key="copilot.id"
      class="catalog-item"
      :style="{ '--entry-delay': `${Math.min(index, 7) * 35}ms` }"
    >
      <CopilotCard :copilot="copilot" />
    </div>
  </TransitionGroup>
</template>
<style scoped>
.catalog-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.catalog-item {
  min-width: 0;
}
.catalog-item > :deep(.copilot-card) {
  height: 100%;
}
.catalog-list {
  grid-template-columns: 1fr;
}
.catalog-large > .catalog-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 258px;
}
.catalog-motion-enter-active {
  transition:
    opacity 280ms var(--entry-delay),
    transform 280ms var(--entry-delay);
}
.catalog-motion-leave-active {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  transition:
    opacity 180ms,
    transform 180ms;
}
.catalog-motion-move {
  transition: transform 280ms cubic-bezier(0.22, 0.68, 0.2, 1);
}
.catalog-motion-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.catalog-motion-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
@media (min-width: 1700px) {
  .catalog-grid:not(.catalog-list) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 1250px) {
  .catalog-grid:not(.catalog-list) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .catalog-grid:not(.catalog-list) {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .catalog-motion-enter-active,
  .catalog-motion-leave-active,
  .catalog-motion-move {
    transition: none;
  }
  .catalog-motion-enter-from,
  .catalog-motion-leave-to {
    transform: none;
  }
}
</style>
