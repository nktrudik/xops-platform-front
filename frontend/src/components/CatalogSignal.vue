<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { searchCopilots, type Copilot } from '../domain/copilot'
import { buildSignalNodes } from './signal-layout'
import SignalConstellation from './SignalConstellation.vue'
import SignalInspector from './SignalInspector.vue'

const props = defineProps<{ copilots: readonly Copilot[]; query: string; loading: boolean }>()
const root = useTemplateRef<HTMLElement>('root')
const descriptionId = useId()
const activeId = shallowRef<string | null>(null)
const paused = shallowRef(false)
const inView = shallowRef(true)
const pageVisible = shallowRef(true)
const available = computed(() => props.copilots.filter((item) => item.status === 'available'))
const nodes = computed(() => buildSignalNodes(available.value, props.query))
const active = computed(
  () => nodes.value.find((node) => node.copilot.id === activeId.value)?.copilot,
)
const position = computed(
  () => nodes.value.findIndex((node) => node.copilot.id === activeId.value) + 1,
)
const matchCount = computed(() => searchCopilots(available.value, props.query).length)
const motionPaused = computed(() => paused.value || !inView.value || !pageVisible.value)
watch(nodes, (value) => {
  if (activeId.value && !value.some((node) => node.copilot.id === activeId.value))
    activeId.value = props.query.trim() ? (value[0]?.copilot.id ?? null) : null
})
watch(
  () => props.query,
  () => {
    activeId.value = props.query.trim() ? (nodes.value[0]?.copilot.id ?? null) : null
  },
)
function move(direction: number): void {
  const index = position.value
    ? (position.value - 1 + direction + nodes.value.length) % nodes.value.length
    : direction > 0
      ? 0
      : nodes.value.length - 1
  activeId.value = nodes.value[index]?.copilot.id ?? null
}
function onPointerleave(event: PointerEvent): void {
  if (event.pointerType !== 'touch' && !root.value?.contains(document.activeElement))
    activeId.value = null
}
function onEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') activeId.value = null
}
function onVisibility(): void {
  pageVisible.value = !document.hidden
}
let observer: IntersectionObserver | undefined
onMounted(() => {
  onVisibility()
  window.addEventListener('keydown', onEscape)
  document.addEventListener('visibilitychange', onVisibility)
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    observer = new IntersectionObserver((entries) => {
      inView.value = entries.some((entry) => entry.isIntersecting)
    })
    observer.observe(root.value)
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onEscape)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
<template>
  <div
    ref="root"
    class="catalog-signal"
    aria-label="Доступные Copilot в пространстве платформы"
    @pointerleave="onPointerleave"
  >
    <div class="signal-space">
      <SignalConstellation
        :nodes="nodes"
        :active-id="activeId"
        :searching="!!query.trim()"
        :motion-paused="motionPaused"
        :description-id="descriptionId"
        :loading="loading"
        @inspect="(id) => (activeId = id)"
        @toggle-motion="paused = !paused"
      />
      <div class="signal-caption" aria-live="polite">
        <span class="signal-led" /><span>{{
          query.trim() ? `Совпадений: ${matchCount}` : `${available.length} в рабочем пространстве`
        }}</span
        ><span v-if="available.length > nodes.length"
          >+{{ available.length - nodes.length }} в каталоге</span
        >
      </div>
    </div>
    <SignalInspector
      :copilot="active"
      :position="position"
      :total="nodes.length"
      :description-id="descriptionId"
      :loading="loading"
      :searching="!!query.trim()"
      @previous="move(-1)"
      @next="move(1)"
      @clear="activeId = null"
    />
  </div>
</template>
<style scoped>
.catalog-signal {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 196px;
  align-items: center;
  gap: 16px;
  width: 580px;
  flex-shrink: 0;
  min-width: 0;
}
.signal-space {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.signal-caption {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 24px;
  color: #d0d0db;
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.signal-caption > span:last-child:not(:nth-child(2)) {
  color: #b2b2bf;
  padding-left: 8px;
  border-left: 1px solid #62636e;
}
.signal-led {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ff656f;
}
@media (max-width: 1500px) {
  .catalog-signal {
    width: 560px;
    grid-template-columns: minmax(0, 1fr) 192px;
  }
  .signal-caption {
    font-size: 11px;
    gap: 5px;
  }
}
@media (max-width: 1180px) and (min-width: 701px) {
  .catalog-signal {
    width: 300px;
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
@media (max-width: 700px) {
  .catalog-signal {
    width: 100%;
    max-width: 400px;
    margin: 20px auto 0;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .signal-caption {
    font-size: 11px;
  }
}
</style>
