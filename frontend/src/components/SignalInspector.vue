<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import { interfaceLabels, statusLabels, type Copilot } from '../domain/copilot'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  copilot?: Copilot
  position: number
  total: number
  descriptionId: string
  loading: boolean
  searching: boolean
}>()
const canOpen = computed(
  () => props.copilot?.status === 'available' || props.copilot?.status === 'configuration-error',
)
const emit = defineEmits<{ previous: []; next: []; clear: [] }>()
const nextButton = useTemplateRef<HTMLButtonElement>('nextButton')
function clear(): void {
  emit('clear')
  nextButton.value?.focus({ preventScroll: true })
}
function retire(element: Element): void {
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('inert', '')
}
function restore(element: Element): void {
  element.removeAttribute('aria-hidden')
  element.removeAttribute('inert')
}
</script>
<template>
  <section class="signal-inspector" aria-label="Информация о выбранном Copilot">
    <div class="inspector-heading">
      <span><i />В ФОКУСЕ</span
      ><button
        class="inspector-clear"
        :disabled="!copilot"
        aria-label="Сбросить выбор Copilot"
        @click="clear"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <div :id="descriptionId" class="inspector-body" aria-live="polite" aria-atomic="true">
      <Transition
        name="inspector-copy"
        @before-leave="retire"
        @before-enter="restore"
        @leave-cancelled="restore"
      >
        <div v-if="copilot" :key="copilot.id" class="signal-info">
          <b class="inspector-title" :title="copilot.name">{{ copilot.name }}</b>
          <div class="inspector-description" tabindex="0" :aria-label="`Описание ${copilot.name}`">
            <span class="inspector-format">{{
              `${copilot.status === 'available' ? '' : `${statusLabels[copilot.status]} · `}${copilot.interfaceType ? interfaceLabels[copilot.interfaceType] : 'Интерфейс не настроен'}`
            }}</span>
            <p>{{ copilot.description }}</p>
          </div>
          <RouterLink
            v-if="canOpen"
            class="inspector-open"
            :to="{ name: 'copilot', params: { id: copilot.id } }"
            :aria-label="`Открыть выбранный Copilot: ${copilot.name}`"
            ><span>Открыть <span class="inspector-open-word">Copilot</span></span
            ><AppIcon name="arrow"
          /></RouterLink>
          <span v-else class="inspector-unavailable" role="status"
            ><AppIcon name="info" />{{ statusLabels[copilot.status] }}</span
          >
        </div>
        <div v-else key="idle" class="inspector-placeholder">
          <b class="inspector-title">{{
            loading
              ? 'Собираем пространство'
              : total
                ? 'Ваш следующий помощник'
                : searching
                  ? 'Измените запрос'
                  : 'Место для новых идей'
          }}</b>
          <div class="inspector-description">
            <p>
              {{
                loading
                  ? 'Загружаем доступные инструменты.'
                  : total
                    ? 'Выберите узел или просмотрите Copilot-ов стрелками ниже.'
                    : searching
                      ? 'Попробуйте другое название или задачу в поле поиска.'
                      : 'Доступные Copilot-ы появятся здесь после добавления в каталог.'
              }}
            </p>
          </div>
          <span class="inspector-hint"
            ><AppIcon :name="total ? 'compass' : 'sparkles'" />{{
              total
                ? 'Стрелки — обзор. Узел — открыть.'
                : searching
                  ? 'Поиск находится выше'
                  : 'Пространство готово'
            }}</span
          >
        </div>
      </Transition>
    </div>
    <div class="inspector-navigation">
      <button aria-label="Предыдущий Copilot в Signal" :disabled="!total" @click="emit('previous')">
        <AppIcon name="arrow" /></button
      ><span
        >{{ position ? String(position).padStart(2, '0') : '—' }}<i>/</i
        >{{ String(total).padStart(2, '0') }}</span
      ><button
        ref="nextButton"
        aria-label="Следующий Copilot в Signal"
        :disabled="!total"
        @click="emit('next')"
      >
        <AppIcon name="arrow" />
      </button>
    </div>
  </section>
</template>
<style scoped>
.signal-inspector {
  color-scheme: dark;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 288px;
  min-width: 0;
  padding: 16px;
  border: 1px solid #55565e;
  border-radius: 12px;
  background: linear-gradient(150deg, #34353d, #2a2b32);
  box-shadow: inset 0 1px 0 #ffffff0b;
  color: #fff;
}
.inspector-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
}
.inspector-heading > span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.4px;
  color: #d0d0d8;
}
.inspector-heading i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ff505c;
  box-shadow: 0 0 10px #e3061160;
}
.inspector-clear {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 5px;
  background: none;
  border: 0;
  border-radius: 6px;
  color: #d2d2da;
  transition:
    background 180ms,
    color 180ms;
}
.inspector-clear > svg {
  width: 16px;
  height: 16px;
}
.inspector-clear:disabled {
  opacity: 0;
  pointer-events: none;
}
.inspector-clear:hover {
  background: #ffffff14;
  color: white;
}
.inspector-body {
  position: relative;
  flex: 1;
  min-height: 0;
}
.signal-info,
.inspector-placeholder {
  position: absolute;
  inset: 0;
  height: 100%;
  display: grid;
  grid-template-rows: 46px minmax(0, 1fr) 38px;
  gap: 10px;
}
.inspector-title {
  font: 500 15px/1.5 var(--font-heading);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.inspector-description {
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #757581 transparent;
  overscroll-behavior: contain;
}
.inspector-format {
  display: block;
  margin-bottom: 7px;
  color: #ff8e96;
  font-size: 11px;
  line-height: 1.5;
}
.inspector-description p {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: #d6d6df;
  overflow-wrap: anywhere;
}
.inspector-open {
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid #f3424d;
  border-radius: 7px;
  background: var(--red);
  color: white;
  font-size: 11px;
  font-weight: 500;
  transition:
    background 180ms,
    transform 220ms var(--ease-spring);
}
.inspector-open > svg {
  width: 17px;
  height: 17px;
  transition: transform 220ms var(--ease-spring);
}
.inspector-open:hover {
  background: var(--red-hover);
}
.inspector-open:hover > svg {
  transform: translateX(3px);
}
.inspector-open:active {
  transform: scale(0.97);
}
.inspector-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  line-height: 1.5;
  color: #c9c9d3;
}
.inspector-unavailable {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #62636d;
  border-radius: 7px;
  color: #d0d0da;
  font-size: 11px;
}
.inspector-unavailable > svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.inspector-hint > svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #ff7d87;
}
.inspector-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #555660;
  padding-top: 9px;
}
.inspector-navigation button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 30px;
  padding: 6px;
  border: 1px solid #666772;
  border-radius: 6px;
  background: #ffffff08;
  color: white;
  transition:
    background 180ms,
    transform 180ms;
}
.inspector-navigation button:first-child > svg {
  transform: rotate(180deg);
}
.inspector-navigation button:hover:not(:disabled) {
  background: var(--red);
  border-color: #f54f5a;
}
.inspector-navigation button:active {
  transform: scale(0.9);
}
.inspector-navigation svg {
  width: 17px;
  height: 17px;
}
.inspector-navigation > span {
  display: flex;
  gap: 8px;
  color: #e1e1e9;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.inspector-navigation i {
  color: #9797a5;
  font-style: normal;
}
.inspector-copy-enter-active {
  transition:
    opacity 180ms,
    transform 220ms var(--ease-out);
}
.inspector-copy-leave-active {
  pointer-events: none;
  transition:
    opacity 120ms,
    transform 120ms;
}
.inspector-copy-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.inspector-copy-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (max-width: 1180px) and (min-width: 701px), (max-width: 700px) {
  .signal-inspector {
    height: 196px;
    min-height: 196px;
    padding: 14px 16px;
    gap: 8px;
  }
  .signal-info,
  .inspector-placeholder {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: 42px 38px;
    gap: 8px 12px;
  }
  .inspector-title {
    grid-column: 1;
    grid-row: 1;
    font-size: 14px;
  }
  .inspector-description {
    grid-column: 2;
    grid-row: 1 / 3;
  }
  .inspector-description p {
    font-size: 12px;
  }
  .inspector-format {
    font-size: 11px;
  }
  .inspector-open,
  .inspector-hint,
  .inspector-unavailable {
    grid-column: 1;
    grid-row: 2;
  }
  .inspector-open-word {
    display: none;
  }
  .inspector-placeholder .inspector-description {
    display: none;
  }
  .inspector-placeholder .inspector-title {
    grid-column: 1 / 3;
    align-self: center;
  }
  .inspector-placeholder .inspector-hint {
    grid-column: 1 / 3;
  }
  .inspector-navigation button {
    width: 38px;
    height: 32px;
  }
}
</style>
