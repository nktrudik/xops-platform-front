<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { interfaceLabels, type Copilot } from '../domain/copilot'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ copilots: readonly Copilot[]; query: string; loading: boolean }>()
const activeId = shallowRef<string | null>(null)
const available = computed(() => props.copilots.filter((item) => item.status === 'available'))
const nodes = computed(() =>
  available.value.slice(0, 6).map((copilot, index, items) => {
    const angle = (index / Math.max(items.length, 1)) * Math.PI * 2 - Math.PI / 2
    return {
      copilot,
      x: 50 + Math.cos(angle) * 35,
      y: 47 + Math.sin(angle) * 34,
      delay: `${index * 25}ms`,
    }
  }),
)
const active = computed(() => available.value.find((item) => item.id === activeId.value))
function matches(copilot: Copilot): boolean {
  return (
    !props.query.trim() ||
    `${copilot.name} ${copilot.description}`
      .toLocaleLowerCase('ru')
      .includes(props.query.trim().toLocaleLowerCase('ru'))
  )
}
</script>
<template>
  <div
    class="catalog-signal"
    aria-label="Доступные Copilot в пространстве платформы"
    @mouseleave="activeId = null"
    @keydown.esc="activeId = null"
  >
    <svg class="signal-orbits" viewBox="0 0 420 250" fill="none" aria-hidden="true">
      <ellipse cx="210" cy="118" rx="144" ry="86" stroke="#54555c" stroke-width=".8" />
      <ellipse cx="210" cy="118" rx="92" ry="55" stroke="#414248" stroke-width=".8" />
      <path d="M28 118h34m296 0h34M210 10v16m0 184v20" stroke="#77777f" stroke-width=".8" />
      <ellipse
        class="signal-sweep"
        cx="210"
        cy="118"
        rx="144"
        ry="86"
        stroke="#E30611"
        stroke-width="1.5"
        stroke-dasharray="54 690"
      />
      <circle cx="210" cy="118" r="31" fill="#28292f" stroke="#62636a" />
      <path d="m194 102 32 32m0-32-32 32" stroke="white" stroke-width="7" />
      <circle
        cx="210"
        cy="118"
        r="44"
        stroke="#E30611"
        stroke-opacity=".5"
        stroke-dasharray="2 6"
      />
    </svg>
    <span class="signal-coordinate" aria-hidden="true">XOPS / SIGNAL</span>
    <RouterLink
      v-for="node in nodes"
      :key="node.copilot.id"
      class="signal-node"
      :class="{ 'node-active': activeId === node.copilot.id, 'node-muted': !matches(node.copilot) }"
      :style="{ left: `${node.x}%`, top: `${node.y}%`, '--node-delay': node.delay }"
      :to="{ name: 'copilot', params: { id: node.copilot.id } }"
      :aria-label="`Открыть на карте: ${node.copilot.name}`"
      @mouseenter="activeId = node.copilot.id"
      @focus="activeId = node.copilot.id"
      @blur="activeId = null"
    >
      <span class="signal-node-icon"><AppIcon :name="node.copilot.icon" /><i /></span
      ><span class="signal-node-label">{{ node.copilot.name }}</span>
    </RouterLink>
    <span v-if="!nodes.length" class="signal-empty">{{
      loading ? 'Загружаем пространство…' : 'Помощники появятся здесь'
    }}</span>
    <div class="signal-caption">
      <span class="signal-led" /><span>{{ available.length }} в рабочем пространстве</span
      ><span v-if="available.length > nodes.length"
        >+{{ available.length - nodes.length }} в каталоге</span
      >
    </div>
    <Transition name="signal-info"
      ><div v-if="active" class="signal-info" role="status">
        <span class="signal-info-kicker"
          >Доступен · {{ active.interfaceType ? interfaceLabels[active.interfaceType] : '' }}</span
        ><b>{{ active.name }}</b>
        <p>{{ active.description }}</p>
        <span class="signal-info-action"
          >Enter или клик — открыть <AppIcon name="arrow"
        /></span></div
    ></Transition>
  </div>
</template>
<style scoped>
.catalog-signal {
  width: 420px;
  height: 228px;
  position: relative;
  flex-shrink: 0;
  isolation: isolate;
}
.signal-orbits {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}
.signal-sweep {
  animation: signal-trace 650ms cubic-bezier(0.25, 0.5, 0.3, 1) both;
}
.signal-coordinate {
  position: absolute;
  right: 14px;
  top: 8px;
  color: #aaaab2;
  font-size: 8px;
  letter-spacing: 2px;
}
.signal-node {
  position: absolute;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transform: translate(-50%, -50%);
  width: 108px;
  padding: 3px 0;
  text-align: center;
  border-radius: 10px;
  animation: node-arrive 500ms var(--node-delay) backwards;
  transition: opacity 200ms;
}
.signal-node-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: #313239;
  color: #ebebef;
  border: 1px solid #64656c;
  border-radius: 11px;
  transition:
    transform 220ms,
    background 220ms,
    border-color 220ms,
    box-shadow 220ms;
}
.signal-node-icon > svg {
  width: 17px;
  height: 17px;
}
.signal-node-icon i {
  position: absolute;
  right: -2px;
  top: -2px;
  width: 6px;
  height: 6px;
  background: #f94650;
  border: 1px solid #202126;
  border-radius: 50%;
}
.signal-node-label {
  max-width: 104px;
  font-size: 9px;
  color: #ceced5;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  padding: 2px 5px;
  background: #25262c;
  border-radius: 3px;
}
.node-active {
  z-index: 4;
}
.node-active .signal-node-icon {
  transform: translateY(-4px) scale(1.1);
  background: #e30611;
  border-color: #ff7c84;
  box-shadow: 0 0 0 5px rgb(227 6 17 / 13%);
}
.node-active .signal-node-label {
  color: white;
}
.node-muted {
  opacity: 0.25;
}
.signal-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #c3c3cd;
  font-size: 9px;
}
.signal-caption > span:last-child:not(:nth-child(2)) {
  color: #a2a2ac;
  padding-left: 8px;
  border-left: 1px solid #5d5e68;
}
.signal-led {
  width: 4px;
  height: 4px;
  background: #ff505b;
  border-radius: 50%;
}
.signal-empty {
  position: absolute;
  left: 50%;
  top: 72%;
  transform: translate(-50%);
  font-size: 9px;
  color: #b7b7c1;
  white-space: nowrap;
}
.signal-info {
  position: absolute;
  z-index: 5;
  right: 4px;
  bottom: 22px;
  width: 262px;
  padding: 16px;
  color: var(--text);
  background: #fff;
  border: 1px solid #dddde2;
  border-radius: 12px;
  box-shadow: 0 12px 36px rgb(0 0 0 / 25%);
  pointer-events: none;
}
.signal-info-kicker {
  display: block;
  font-size: 9px;
  color: var(--text-secondary);
  margin-bottom: 9px;
}
.signal-info b {
  font: 500 13px/1.5 var(--font-heading);
  display: block;
}
.signal-info p {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.signal-info-action {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--red);
  font-size: 9px;
}
.signal-info-action svg {
  width: 13px;
  height: 13px;
}
.signal-info-enter-active,
.signal-info-leave-active {
  transition:
    opacity 160ms,
    transform 160ms;
}
.signal-info-enter-from,
.signal-info-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
@keyframes signal-trace {
  from {
    stroke-dashoffset: 744;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}
@keyframes node-arrive {
  from {
    opacity: 0;
    translate: 0 8px;
    scale: 0.9;
  }
  to {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }
}
@media (max-width: 1250px) {
  .catalog-signal {
    width: 340px;
    height: 228px;
  }
  .signal-node-label {
    max-width: 82px;
    font-size: 8px;
  }
  .signal-node {
    width: 88px;
  }
}
@media (max-width: 1050px) {
  .catalog-signal {
    width: 280px;
  }
  .signal-coordinate {
    display: none;
  }
}
@media (max-width: 700px) {
  .catalog-signal {
    width: 100%;
    height: 200px;
    max-width: 390px;
    margin: 0 auto;
  }
  .signal-node {
    width: 100px;
  }
  .signal-node-label {
    max-width: 96px;
  }
  .signal-caption {
    font-size: 9px;
  }
  .signal-info {
    right: 0;
    bottom: 15px;
  }
}
</style>
