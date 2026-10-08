<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Copilot } from '../domain/copilot'
import { usePlatform } from '../app/context'
import { useChat } from '../composables/use-chat'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ copilot: Copilot }>()
const { chat } = usePlatform()
const { messages, pending, error, send, retry } = useChat(props.copilot, chat)
const draft = ref('')
const history = ref<HTMLElement>()
const input = ref<HTMLTextAreaElement>()

async function submit(): Promise<void> {
  if (!draft.value.trim() || pending.value || error.value) return
  const text = draft.value
  draft.value = ''
  await send(text)
  await nextTick()
  input.value?.focus()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submit()
  }
}

watch(
  () => [messages.value.length, pending.value],
  async () => {
    await nextTick()
    if (history.value) history.value.scrollTop = history.value.scrollHeight
  },
)
</script>

<template>
  <section class="chat-panel surface" aria-label="Чат с Copilot">
    <div class="panel-toolbar">
      <span class="panel-title"><AppIcon name="chat" />Чат с помощником</span
      ><span class="mock-badge">Mock-режим</span>
    </div>
    <div
      ref="history"
      class="chat-history"
      role="log"
      aria-label="Сообщения чата"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div v-if="!messages.length" class="chat-welcome">
        <span class="icon-tile"><AppIcon name="sparkles" /></span>
        <h2>С чего начнём?</h2>
        <p>
          Опишите задачу или задайте вопрос.<br />Этот чат демонстрирует работу платформы; ответы
          пока формируются без AI.
        </p>
      </div>
      <article
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="`message-${message.role}`"
      >
        <span class="message-author">{{ message.role === 'user' ? 'Вы' : copilot.name }}</span>
        <p>{{ message.content }}</p>
      </article>
      <div v-if="pending" class="chat-pending" role="status">
        <span class="spinner" aria-hidden="true" />Помощник готовит ответ…
      </div>
    </div>
    <div v-if="error" class="chat-error" role="alert">
      <span>{{ error }}</span
      ><button class="text-button" @click="retry">Повторить</button>
    </div>
    <form class="chat-composer" @submit.prevent="submit">
      <label class="sr-only" for="chat-input">Сообщение Copilot</label
      ><textarea
        id="chat-input"
        ref="input"
        v-model="draft"
        rows="2"
        maxlength="4000"
        placeholder="Напишите сообщение…"
        :disabled="pending || !!error"
        @keydown="onKeydown"
      /><button
        class="button button-primary send-button"
        type="submit"
        :disabled="!draft.trim() || pending || !!error"
        aria-label="Отправить сообщение"
      >
        <AppIcon name="send" />
      </button>
    </form>
    <p class="composer-hint">
      Enter — отправить · Shift + Enter — новая строка<span>{{ draft.length }} / 4000</span>
    </p>
  </section>
</template>

<style scoped>
.chat-panel {
  overflow: hidden;
}
.chat-history {
  min-height: 340px;
  height: min(53vh, 600px);
  overflow-y: auto;
  padding: 24px 30px;
}
.chat-welcome {
  padding: 56px 0;
  max-width: 520px;
  margin: auto;
}
.chat-welcome h2 {
  font-size: 27px;
  margin: 20px 0 12px;
}
.chat-welcome p {
  color: var(--text-secondary);
  line-height: 1.7;
}
.message {
  width: fit-content;
  max-width: 85%;
  border-radius: 18px;
  padding: 16px 20px;
  margin-bottom: 18px;
}
.message-user {
  margin-left: auto;
  background: var(--red-soft);
}
.message-assistant {
  background: var(--background);
}
.message-author {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}
.message p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.65;
  margin: 8px 0 0;
}
.chat-pending {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--text-secondary);
  font-size: 14px;
}
.chat-pending .spinner {
  width: 16px;
  height: 16px;
}
.chat-composer {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin: 0 24px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 16px;
}
.chat-composer:focus-within {
  border-color: var(--text-secondary);
}
textarea {
  width: 100%;
  resize: vertical;
  min-height: 48px;
  max-height: 180px;
  padding: 4px 8px;
  border: 0;
  outline: none;
  background: transparent;
  line-height: 1.5;
}
.send-button {
  width: 46px;
  min-height: 46px;
  padding: 0;
  flex-shrink: 0;
  border-radius: 12px;
}
.composer-hint {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  margin: 12px 30px 24px;
}
.chat-error {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin: 0 24px 16px;
  color: var(--red);
}
@media (max-width: 640px) {
  .chat-history {
    padding: 20px 16px;
  }
  .message {
    max-width: 95%;
  }
  .chat-composer {
    margin: 0 14px;
    gap: 8px;
  }
  .composer-hint {
    margin: 12px 20px 20px;
  }
}
</style>
