<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Copilot } from '../domain/copilot'
import { usePlatform } from '../app/context'
import { freshApplicationUrl } from '../services/embedding'
import AppIcon from './AppIcon.vue'
import StatePanel from './StatePanel.vue'

const props = defineProps<{ copilot: Extract<Copilot, { interfaceType: 'embedded' }> }>()
const { embedding } = usePlatform()
const state = ref<'checking' | 'loading' | 'ready' | 'error'>('checking')
const reason = ref('')
const generation = ref(0)
const iframeUrl = ref<string>()
let controller: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined

function fail(message: string): void {
  clearTimeout(timer)
  reason.value = message
  state.value = 'error'
}

async function open(): Promise<void> {
  controller?.abort()
  clearTimeout(timer)
  controller = new AbortController()
  const current = controller
  state.value = 'checking'
  reason.value = ''
  generation.value++
  if (!props.copilot.applicationUrl)
    return fail('Адрес приложения не настроен. Проверьте конфигурацию платформы.')
  if (
    location.protocol === 'https:' &&
    new URL(props.copilot.applicationUrl).protocol === 'http:'
  ) {
    return fail(
      'Браузер запрещает HTTP-приложение на HTTPS-странице. Укажите HTTPS-адрес приложения.',
    )
  }
  try {
    const result = await embedding(props.copilot.id, current.signal)
    if (current.signal.aborted) return
    if (result.state !== 'ready') return fail(result.reason)
    iframeUrl.value = freshApplicationUrl(props.copilot.applicationUrl)
    state.value = 'loading'
    timer = setTimeout(
      () =>
        fail('Приложение не ответило вовремя или браузер запретил встраивание. Повторите попытку.'),
      15000,
    )
  } catch {
    if (!current.signal.aborted)
      fail('Не удалось связаться с приложением. Проверьте доступность сервиса и повторите попытку.')
  }
}

function loaded(): void {
  if (state.value !== 'loading') return
  clearTimeout(timer)
  state.value = 'ready'
}

onMounted(open)
onBeforeUnmount(() => {
  controller?.abort()
  clearTimeout(timer)
})
</script>

<template>
  <section class="embedded-panel surface" aria-label="Приложение Copilot">
    <div class="panel-toolbar">
      <span class="panel-title"><AppIcon name="layers" />Интерфейс приложения</span
      ><button class="text-button" :disabled="state === 'checking'" @click="open">
        <AppIcon name="refresh" />Повторить
      </button>
    </div>
    <StatePanel v-if="state === 'checking'" title="Проверяем доступность приложения" loading />
    <StatePanel
      v-else-if="state === 'error'"
      title="Не удалось открыть приложение"
      :description="reason"
      ><button class="button button-primary" @click="open">Повторить попытку</button></StatePanel
    >
    <div v-else class="iframe-wrap" :aria-busy="state === 'loading'">
      <div v-if="state === 'loading'" class="frame-loading" role="status">
        <span class="spinner" />Загружаем интерфейс…
      </div>
      <iframe
        :key="generation"
        :src="iframeUrl"
        :title="copilot.name"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
        referrerpolicy="no-referrer"
        @load="loaded"
        @error="fail('Ошибка загрузки приложения. Повторите попытку.')"
      />
    </div>
    <div v-if="state === 'ready'" class="embed-help">
      <span
        >Если интерфейс пустой или браузер показал ошибку, приложение могло запретить
        встраивание.</span
      ><button
        class="text-button"
        @click="
          fail(
            'Браузер не отобразил приложение. Проверьте настройки встраивания сервиса или повторите попытку.',
          )
        "
      >
        Приложение не отображается
      </button>
    </div>
  </section>
</template>

<style scoped>
.embedded-panel {
  overflow: hidden;
}
.embedded-panel :deep(.state-panel) {
  border-radius: 0;
  box-shadow: none;
}
.iframe-wrap {
  position: relative;
}
iframe {
  display: block;
  border: 0;
  width: 100%;
  min-height: 570px;
  height: 67vh;
  background: white;
}
.frame-loading {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  background: white;
  color: var(--text-secondary);
  pointer-events: none;
}
.embed-help {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  background: var(--background);
  color: var(--text-secondary);
  font-size: 12px;
}
@media (max-width: 640px) {
  iframe {
    min-height: 470px;
  }
}
</style>
