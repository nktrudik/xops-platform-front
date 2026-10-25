<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import type { SignalNode } from './signal-layout'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  nodes: readonly SignalNode[]
  activeId: string | null
  searching: boolean
  motionPaused: boolean
  descriptionId: string
  loading: boolean
}>()
const emit = defineEmits<{ inspect: [id: string]; toggleMotion: [] }>()
const map = useTemplateRef<HTMLElement>('map')
const active = computed(() => props.nodes.find((node) => node.copilot.id === props.activeId))
async function onKeydown(event: KeyboardEvent): Promise<void> {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  if (!(event.target instanceof Element) || !event.target.closest('.signal-node')) return
  event.preventDefault()
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
  const current = props.nodes.findIndex((node) => node.copilot.id === props.activeId)
  const next = (current + direction + props.nodes.length) % props.nodes.length
  const node = props.nodes[next]
  if (!node) return
  emit('inspect', node.copilot.id)
  await nextTick()
  map.value
    ?.querySelectorAll<HTMLAnchorElement>('.signal-node')
    [next]?.focus({ preventScroll: true })
}
</script>
<template>
  <nav
    ref="map"
    class="signal-map"
    :class="{ 'has-active': active, 'signal-searching': searching, 'motion-paused': motionPaused }"
    aria-label="Copilot в пространстве Signal"
    @keydown="onKeydown"
  >
    <div class="signal-map-heading">
      <span><i />SIGNAL / {{ String(nodes.length).padStart(2, '0') }}</span
      ><button
        class="signal-motion"
        :aria-label="motionPaused ? 'Возобновить анимацию Signal' : 'Приостановить анимацию Signal'"
        :aria-pressed="motionPaused"
        @click="emit('toggleMotion')"
      >
        <AppIcon :name="motionPaused ? 'play' : 'pause'" />
      </button>
    </div>
    <svg class="signal-orbits" viewBox="0 0 400 300" fill="none" aria-hidden="true">
      <ellipse cx="200" cy="138" rx="167" ry="108" stroke="#6b6c78" stroke-opacity=".4" />
      <ellipse cx="200" cy="138" rx="140" ry="86" stroke="#83848e" stroke-opacity=".6" />
      <ellipse cx="200" cy="138" rx="94" ry="57" stroke="#5c5d69" stroke-opacity=".65" />
      <path d="M18 138h20m324 0h20M200 16v10m0 224v10" stroke="#9696a3" stroke-opacity=".6" />
      <path
        v-for="node in nodes"
        :key="node.copilot.id"
        :d="`M200 138L${node.x} ${node.y}`"
        stroke="#7e7f8a"
        stroke-opacity=".13"
      />
      <g v-if="active" :key="active.copilot.id" class="signal-connection">
        <path
          :d="`M200 138L${active.x} ${active.y}`"
          stroke="#f64a57"
          stroke-width="6"
          stroke-opacity=".12"
        />
        <path
          :d="`M200 138L${active.x} ${active.y}`"
          stroke="#f45764"
          stroke-width="1.5"
          stroke-opacity=".8"
        />
        <path
          class="signal-flow signal-ambient"
          :d="`M200 138L${active.x} ${active.y}`"
          stroke="#fff0f2"
          stroke-width="2.5"
          stroke-dasharray="4 25"
        />
      </g>
      <g class="signal-core-aura signal-ambient">
        <circle
          cx="200"
          cy="138"
          r="55"
          fill="#e30611"
          fill-opacity=".07"
          stroke="#e30611"
          stroke-opacity=".26"
        />
      </g>
      <g class="signal-core-halo signal-ambient">
        <circle
          cx="200"
          cy="138"
          r="43"
          stroke="#f34150"
          stroke-opacity=".7"
          stroke-dasharray="2 7"
        />
      </g>
      <circle cx="200" cy="138" r="32" fill="#35363f" stroke="#b7b7c2" stroke-opacity=".55" />
      <path d="m186 124 28 28m0-28-28 28" stroke="white" stroke-width="6" />
      <circle class="signal-beacon signal-ambient" cx="33" cy="138" r="2" fill="#ff7b87" />
      <circle
        class="signal-beacon beacon-secondary signal-ambient"
        cx="367"
        cy="138"
        r="2"
        fill="#ff7b87"
      />
    </svg>
    <RouterLink
      v-for="(node, index) in nodes"
      :key="node.copilot.id"
      class="signal-node"
      :class="{
        'node-top': index === 0,
        'node-active': activeId === node.copilot.id,
        'node-muted': activeId && activeId !== node.copilot.id,
        'node-match': searching,
      }"
      :style="{ left: `${node.x / 4}%`, top: `${node.y / 3}%`, '--node-delay': `${index * 25}ms` }"
      :to="{ name: 'copilot', params: { id: node.copilot.id } }"
      :aria-label="`Открыть на карте: ${node.copilot.name}`"
      :aria-describedby="activeId === node.copilot.id ? descriptionId : undefined"
      :aria-controls="descriptionId"
      @pointerenter="
        (event) => {
          if (event.pointerType !== 'touch') emit('inspect', node.copilot.id)
        }
      "
      @pointerdown="emit('inspect', node.copilot.id)"
      @focus="emit('inspect', node.copilot.id)"
    >
      <span class="signal-node-icon"><AppIcon :name="node.copilot.icon" /><i /></span
      ><span class="signal-node-label">{{ node.copilot.name }}</span>
    </RouterLink>
    <span v-if="!nodes.length" class="signal-empty">{{
      loading
        ? 'Загружаем инструменты…'
        : searching
          ? 'Попробуйте другой поисковый запрос'
          : 'Пространство открыто для новых Copilot'
    }}</span>
  </nav>
</template>
<style scoped>
.signal-map {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  isolation: isolate;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 46%, #e306110d, transparent 65%);
}
.signal-map-heading {
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}
.signal-map-heading > span {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #c6c6d0;
}
.signal-map-heading i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fc4f60;
}
.signal-motion {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 7px;
  color: #d9d9e3;
  background: #ffffff08;
  border: 1px solid #646570;
  border-radius: 7px;
  transition:
    color 180ms,
    background 180ms,
    transform 180ms;
}
.signal-motion > svg {
  width: 15px;
  height: 15px;
}
.signal-motion:hover {
  background: #ffffff1c;
  color: white;
}
.signal-motion:active {
  transform: scale(0.9);
}
.signal-orbits {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.signal-core-aura,
.signal-core-halo {
  transform-box: fill-box;
  transform-origin: center;
}
.signal-core-aura {
  animation: core-breathe 5s ease-in-out infinite alternate;
}
.signal-core-halo {
  animation: halo-breathe 6s ease-in-out infinite alternate;
}
.signal-beacon {
  animation: beacon-breathe 6s ease-in-out infinite alternate;
}
.beacon-secondary {
  animation-delay: -3s;
}
.signal-flow {
  animation: signal-energy 1.8s linear infinite;
}
.signal-connection {
  animation: connection-arrive 220ms ease-out;
}
.motion-paused .signal-ambient {
  animation-play-state: paused;
}
.signal-node {
  position: absolute;
  z-index: 1;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  border-radius: 13px;
  animation: node-arrive 450ms var(--node-delay) backwards;
  transition: opacity 250ms;
}
.signal-node-icon {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #454651, #2e2f38);
  border: 1px solid #8c8d98;
  border-radius: 13px;
  color: #f6f6fa;
  box-shadow:
    0 3px 7px #00000026,
    inset 0 1px 0 #ffffff12;
  transition:
    transform 360ms var(--ease-spring),
    background 200ms,
    border-color 200ms,
    box-shadow 250ms;
}
.signal-node-icon > svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.7;
}
.signal-node-icon i {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 7px;
  height: 7px;
  border: 2px solid #282930;
  background: #ff636f;
  border-radius: 50%;
}
.signal-node-label {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  width: 112px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
  font-weight: 500;
  color: #e1e1e9;
  text-shadow: 0 1px 3px #202126;
  transition: color 180ms;
}
.node-top .signal-node-label {
  left: -8px;
  top: 50%;
  transform: translate(-100%, -60%);
}
.node-muted {
  opacity: 0.62;
}
.node-match .signal-node-icon {
  border-color: #ff6c7b;
  background: #572b34;
  box-shadow: 0 0 0 4px #e3061110;
}
.node-match .signal-node-label {
  color: #fff;
}
.node-active {
  z-index: 3;
  opacity: 1;
}
.node-active .signal-node-icon {
  transform: translateY(-4px) scale(1.12);
  background: linear-gradient(145deg, #fa303f, #d50510);
  border-color: #ffb3bb;
  box-shadow:
    0 0 0 5px #e306111f,
    0 7px 20px #e306112b;
}
.node-active .signal-node-label {
  color: white;
}
.signal-node:active .signal-node-icon {
  transform: scale(0.95);
}
.signal-node:focus-visible {
  outline: 2px solid #ff9ca6;
  outline-offset: 7px;
}
.signal-empty {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 12%;
  color: #d1d1db;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}
.signal-searching :is(.signal-core-halo, .signal-core-aura),
.has-active :is(.signal-core-halo, .signal-core-aura) {
  filter: brightness(1.2);
}
@keyframes core-breathe {
  from {
    opacity: 0.55;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1.08);
  }
}
@keyframes halo-breathe {
  from {
    opacity: 0.45;
    transform: scale(0.98);
  }
  to {
    opacity: 0.85;
    transform: scale(1.06);
  }
}
@keyframes beacon-breathe {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 0.9;
  }
}
@keyframes signal-energy {
  to {
    stroke-dashoffset: -58;
  }
}
@keyframes connection-arrive {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes node-arrive {
  from {
    opacity: 0;
    translate: 0 10px;
    scale: 0.88;
  }
  to {
    opacity: 1;
    translate: 0;
    scale: 1;
  }
}
@media (max-width: 1500px) {
  .signal-node-label {
    width: 108px;
    font-size: 11px;
  }
}
@media (max-width: 700px) {
  .signal-node {
    width: 42px;
    height: 42px;
  }
  .signal-node-label {
    width: 94px;
    font-size: 10px;
  }
  .signal-node-icon > svg {
    width: 21px;
    height: 21px;
  }
  .signal-motion {
    width: 34px;
    height: 34px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .signal-ambient {
    animation: none;
  }
  .signal-motion {
    display: none;
  }
  .signal-node-icon {
    transition: none;
  }
}
</style>
