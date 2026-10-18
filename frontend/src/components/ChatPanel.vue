<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Conversation, Copilot } from '../domain/copilot'
import { usePlatform } from '../app/context'
import { useChat } from '../composables/use-chat'
import AppIcon from './AppIcon.vue'
import DeleteConversationDialog from './DeleteConversationDialog.vue'

const props = defineProps<{ copilot: Copilot }>()
const { chat } = usePlatform()
const {
  messages,
  conversations,
  current,
  nextConversation,
  before,
  loading,
  loadingOlder,
  atLatest,
  pending,
  deleting,
  error,
  loadError,
  send,
  retry,
  select,
  create,
  remove,
  older,
  latest,
  listMore,
  initialize,
} = useChat(props.copilot, chat)
const draft = ref('')
const history = ref<HTMLElement>()
const input = ref<HTMLTextAreaElement>()
const deleteTarget = ref<Conversation | null>(null)
const deleteError = ref('')
const newDialogButton = ref<HTMLButtonElement>()

function askDelete(conversation: Conversation): void {
  deleteError.value = ''
  deleteTarget.value = conversation
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value || deleting.value) return
  const active = current.value?.id === deleteTarget.value.id
  deleteError.value = ''
  try {
    await remove(deleteTarget.value)
    if (active) draft.value = ''
    deleteTarget.value = null
    await nextTick()
    newDialogButton.value?.focus()
  } catch (failure) {
    deleteError.value = failure instanceof Error ? failure.message : 'Не удалось удалить диалог.'
  }
}

async function submit(): Promise<void> {
  if (!draft.value.trim() || pending.value || deleting.value) return
  const text = draft.value
  draft.value = ''
  if (!(await send(text))) draft.value = text
  await nextTick()
  input.value?.focus()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submit()
  }
}

async function onScroll(): Promise<void> {
  const element = history.value
  if (!element || element.scrollTop > 64 || !before.value || loadingOlder.value) return
  const anchor = element.querySelector('article')
  const previousTop = anchor?.getBoundingClientRect().top ?? 0
  await older()
  await nextTick()
  if (anchor?.isConnected) element.scrollTop += anchor.getBoundingClientRect().top - previousTop
}

async function showLatest(): Promise<void> {
  try {
    await latest()
    await nextTick()
    if (history.value) history.value.scrollTop = history.value.scrollHeight
  } catch {
    loadError.value = 'Не удалось загрузить последние сообщения.'
  }
}

watch(
  () => [loading.value, pending.value],
  async () => {
    await nextTick()
    if (history.value) history.value.scrollTop = history.value.scrollHeight
  },
)
</script>

<template>
  <div class="chat-layout">
    <aside class="dialog-list surface" aria-label="Сохранённые диалоги">
      <button
        ref="newDialogButton"
        class="button button-primary new-dialog"
        :disabled="loading || pending || deleting"
        @click="create"
      >
        Новый диалог
      </button>
      <h2>Ваши диалоги</h2>
      <div class="dialog-items">
        <div v-for="conversation in conversations" :key="conversation.id" class="dialog-row">
          <button
            class="dialog-item"
            :aria-pressed="current?.id === conversation.id"
            :disabled="pending || deleting"
            @click="select(conversation)"
          >
            <span>{{ conversation.title }}</span>
            <small>{{ new Date(conversation.created_at).toLocaleDateString('ru-RU') }}</small>
          </button>
          <button
            class="icon-button dialog-delete"
            :aria-label="`Удалить диалог «${conversation.title}»`"
            title="Удалить диалог"
            :disabled="loading || pending || deleting"
            @click="askDelete(conversation)"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </div>
      <button
        v-if="nextConversation"
        class="text-button"
        :disabled="pending || deleting"
        @click="listMore"
      >
        Ещё диалоги
      </button>
    </aside>
    <section class="chat-panel surface" aria-label="Чат с Copilot">
      <div class="panel-toolbar">
        <span class="panel-title"><AppIcon name="chat" />Чат с помощником</span>
        <button v-if="!atLatest" class="text-button" @click="showLatest">
          К последним сообщениям
        </button>
      </div>
      <div v-if="loadError" class="chat-error" role="alert">
        {{ loadError }}
        <button class="text-button" @click="current ? select(current) : initialize()">
          Повторить загрузку
        </button>
      </div>
      <div
        ref="history"
        class="chat-history"
        role="log"
        aria-label="Сообщения чата"
        aria-live="polite"
        aria-relevant="additions"
        @scroll="onScroll"
      >
        <div v-if="loading || loadingOlder" role="status" class="history-loading">
          <span class="spinner" />Загружаем сообщения…
        </div>
        <p v-else-if="before" class="history-hint">
          Прокрутите вверх, чтобы увидеть предыдущие сообщения
        </p>
        <div v-if="!loading && !messages.length" class="chat-welcome">
          <span class="icon-tile"><AppIcon name="sparkles" /></span>
          <h2>С чего начнём?</h2>
          <p>
            Опишите задачу или задайте вопрос.<br />Сообщение будет отправлено выбранному Copilot.
          </p>
        </div>
        <article
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="`message-${message.role}`"
          :data-message-id="message.id"
        >
          <span class="message-author">{{ message.role === 'user' ? 'Вы' : copilot.name }}</span>
          <p>{{ message.content }}</p>
          <small v-if="message.status === 'failed'" class="message-failed">{{
            message.error ?? 'Ответ не был получен'
          }}</small>
        </article>
        <div v-if="pending" class="chat-pending" role="status">
          <span class="spinner" aria-hidden="true" />Помощник готовит ответ…
        </div>
      </div>
      <div v-if="error" class="chat-error" role="alert">
        <span>{{ error }}</span
        ><button class="text-button" :disabled="pending || deleting" @click="retry">
          Повторить
        </button>
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
          :disabled="loading || !!loadError || pending || deleting"
          @keydown="onKeydown"
        /><button
          class="button button-primary send-button"
          type="submit"
          :disabled="!draft.trim() || loading || !!loadError || pending || deleting"
          aria-label="Отправить сообщение"
        >
          <AppIcon name="send" />
        </button>
      </form>
      <p class="composer-hint">
        Enter — отправить · Shift + Enter — новая строка<span>{{ draft.length }} / 4000</span>
      </p>
    </section>
    <DeleteConversationDialog
      v-if="deleteTarget"
      :title="deleteTarget.title"
      :pending="deleting"
      :error="deleteError"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.chat-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 20px;
}
.dialog-list {
  padding: 20px 14px;
  align-self: start;
}
.dialog-list h2 {
  font-size: 15px;
  margin: 24px 8px 12px;
}
.new-dialog {
  width: 100%;
}
.dialog-items {
  max-height: 52vh;
  overflow-y: auto;
}
.dialog-item {
  min-width: 0;
  width: 100%;
  display: grid;
  gap: 6px;
  text-align: left;
  border: 0;
  border-radius: 12px;
  padding: 14px 12px;
  background: transparent;
  cursor: pointer;
}
.dialog-row {
  display: flex;
  align-items: center;
  gap: 2px;
}
.dialog-delete {
  flex-shrink: 0;
  color: var(--muted);
}
.dialog-delete:hover {
  color: var(--red);
  background: var(--red-soft);
}
.message-failed {
  display: block;
  color: var(--red);
  line-height: 1.5;
  margin-top: 10px;
}
.dialog-item[aria-pressed='true'] {
  background: var(--red-soft);
}
.dialog-item:hover {
  background: var(--background);
}
.dialog-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dialog-item small,
.history-hint {
  color: var(--text-secondary);
  font-size: 12px;
}
.history-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}
.history-loading .spinner {
  width: 16px;
  height: 16px;
}
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
  .chat-layout {
    grid-template-columns: 1fr;
  }
  .dialog-list {
    padding: 16px;
  }
  .dialog-items {
    display: flex;
    gap: 8px;
    max-height: 120px;
  }
  .dialog-row {
    min-width: 180px;
    max-width: 250px;
  }
  .dialog-list h2 {
    margin-top: 14px;
  }
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
