<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlatform } from '../app/context'
import { interfaceLabels, searchCopilots, type Copilot } from '../domain/copilot'
import AppIcon from './AppIcon.vue'
import StatusBadge from './StatusBadge.vue'

const open = defineModel<boolean>({ required: true })
const { copilots, loading, error } = usePlatform()
const router = useRouter()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')
const list = useTemplateRef<HTMLUListElement>('list')
const query = shallowRef('')
const highlighted = shallowRef(0)
const results = computed(() => searchCopilots(copilots.value, query.value).slice(0, 30))
const selectedId = computed(() =>
  results.value.length ? `command-option-${highlighted.value}` : undefined,
)
function canOpen(copilot: Copilot): boolean {
  return copilot.status === 'available' || copilot.status === 'configuration-error'
}
watch(open, async (value) => {
  if (!value) {
    dialog.value?.close()
    return
  }
  query.value = ''
  highlighted.value = 0
  await nextTick()
  dialog.value?.showModal()
  input.value?.focus()
})
watch(results, () => {
  highlighted.value = 0
})
async function choose(copilot: Copilot): Promise<void> {
  if (!canOpen(copilot)) return
  open.value = false
  await router.push({ name: 'copilot', params: { id: copilot.id } })
  await nextTick()
  document.getElementById('main')?.focus({ preventScroll: true })
}
async function move(event: KeyboardEvent): Promise<void> {
  if (event.key === 'Enter') {
    event.preventDefault()
    const copilot = results.value[highlighted.value]
    if (copilot) await choose(copilot)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  if (!results.value.length) return
  highlighted.value =
    (highlighted.value + (event.key === 'ArrowDown' ? 1 : results.value.length - 1)) %
    results.value.length
  await nextTick()
  list.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
}
</script>
<template>
  <dialog
    ref="dialog"
    class="command-palette"
    aria-label="Быстрый поиск Copilot"
    @cancel.prevent="open = false"
    @close="open = false"
  >
    <template v-if="open">
      <div class="command-heading">
        <span><span class="command-led" />БЫСТРЫЙ ДОСТУП</span
        ><button class="command-close" aria-label="Закрыть быстрый поиск" @click="open = false">
          Esc
        </button>
      </div>
      <div class="command-input">
        <AppIcon name="search" /><label class="sr-only" for="command-query"
          >Быстрый поиск Copilot</label
        ><input
          id="command-query"
          ref="input"
          v-model="query"
          name="command-query"
          autocomplete="off"
          placeholder="Название помощника или задача…"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-results"
          :aria-activedescendant="selectedId"
          @keydown="move"
        />
      </div>
      <div class="command-results-heading">
        <span>{{ query ? 'Результаты поиска' : 'Инструменты платформы' }}</span
        ><span aria-live="polite">{{ results.length }}</span>
      </div>
      <p v-if="loading" class="command-empty" role="status">Загружаем каталог…</p>
      <p v-else-if="error && !copilots.length" class="command-empty" role="status">
        Каталог недоступен. Повторите загрузку на главной.
      </p>
      <p v-else-if="!results.length" class="command-empty" role="status">
        Ничего не найдено. Попробуйте другое название.
      </p>
      <ul
        id="command-results"
        ref="list"
        class="command-results"
        role="listbox"
        aria-label="Найденные Copilot"
      >
        <li
          v-for="(copilot, index) in results"
          :id="`command-option-${index}`"
          :key="copilot.id"
          role="option"
          :aria-selected="highlighted === index"
          :aria-disabled="!canOpen(copilot)"
          @mouseenter="highlighted = index"
        >
          <button tabindex="-1" :disabled="!canOpen(copilot)" @click="choose(copilot)">
            <span class="command-result-icon"><AppIcon :name="copilot.icon" /></span
            ><span class="command-result-copy"
              ><b>{{ copilot.name }}</b
              ><small>{{
                copilot.interfaceType
                  ? interfaceLabels[copilot.interfaceType]
                  : 'Требуется настройка'
              }}</small></span
            ><StatusBadge :status="copilot.status" /><AppIcon
              v-if="highlighted === index && canOpen(copilot)"
              class="command-result-arrow"
              name="arrow"
            />
          </button>
        </li>
      </ul>
      <div class="command-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span><span><kbd>Enter</kbd> открыть</span
        ><span><kbd>Esc</kbd> закрыть</span>
      </div>
    </template>
  </dialog>
</template>
<style scoped>
.command-palette {
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100dvh - 80px);
  padding: 0;
  margin: min(16vh, 150px) auto 0;
  border: 1px solid #4d4e57;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  color: var(--text);
  box-shadow: 0 28px 100px rgb(0 0 0 / 25%);
  overscroll-behavior: contain;
}
.command-palette[open] {
  animation: palette-arrive 200ms ease-out;
}
.command-palette::backdrop {
  background: rgb(15 16 22 / 55%);
  backdrop-filter: blur(5px);
}
.command-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  background: #202126;
  color: #c9c9d2;
}
.command-heading > span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  letter-spacing: 1.4px;
}
.command-led {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ff414d;
}
.command-close {
  color: #ceced6;
  font-size: 9px;
  border: 1px solid #666770;
  background: #35363d;
  border-radius: 4px;
  padding: 4px 6px;
}
.command-close:hover {
  color: white;
  background: #50515a;
}
.command-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border);
}
.command-input > svg {
  width: 21px;
  height: 21px;
  color: var(--red);
}
.command-input input {
  height: 34px;
  padding: 0;
  border: 0;
  width: 100%;
  min-width: 0;
  background: none;
  color: var(--text);
  font-size: 16px;
}
.command-input input:focus-visible {
  outline: none;
}
.command-input:focus-within {
  box-shadow: inset 0 -2px 0 var(--red);
}
.command-results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px 8px;
  color: var(--text-secondary);
  font-size: 10px;
}
.command-results {
  max-height: min(360px, 48dvh);
  overflow-y: auto;
  list-style: none;
  padding: 0 10px;
  margin: 0 0 10px;
  overscroll-behavior: contain;
}
.command-results li {
  border-radius: 8px;
  transition: background 150ms;
}
.command-results li[aria-selected='true'] {
  background: #f4f1f2;
}
.command-results li[aria-selected='true'] .command-result-icon {
  color: var(--red);
  background: #fce7e9;
}
.command-results li > button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 70px;
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: none;
}
.command-result-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: #f0f1f4;
  color: #616875;
  border-radius: 9px;
  transition:
    background 150ms,
    color 150ms;
}
.command-result-icon svg {
  width: 19px;
  height: 19px;
}
.command-result-copy {
  min-width: 0;
  flex: 1;
}
.command-result-copy b {
  display: block;
  font: 500 13px/1.4 var(--font-heading);
}
.command-result-copy small {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 5px;
}
.command-result-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--red);
}
.command-empty {
  padding: 24px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.command-footer {
  display: flex;
  gap: 20px;
  border-top: 1px solid var(--border);
  padding: 14px 22px;
  background: #f9f9fa;
  color: var(--text-secondary);
  font-size: 10px;
}
.command-footer > span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.command-footer kbd {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 1px 4px;
  font: 400 9px var(--font-body);
  background: white;
  border: 1px solid var(--border);
  border-radius: 4px;
}
@keyframes palette-arrive {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (max-width: 600px) {
  .command-palette {
    margin-top: 40px;
    max-height: calc(100dvh - 80px);
  }
  .command-input {
    padding: 14px 16px;
  }
  .command-input input {
    font-size: 14px;
  }
  .command-results li > button {
    gap: 10px;
    padding: 10px;
  }
  .command-results :deep(.status-badge) {
    display: none;
  }
  .command-footer {
    gap: 12px;
    padding-inline: 16px;
    font-size: 9px;
  }
  .command-result-copy b {
    font-size: 12px;
  }
}
</style>
