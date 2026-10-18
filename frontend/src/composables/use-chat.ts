import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ChatGateway, Conversation, Copilot, StoredMessage } from '../domain/copilot'

function requestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 15) | 64
  bytes[8] = (bytes[8]! & 63) | 128
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Загружает страницы истории и сохраняет ключ отправки до подтверждения сервера. */
export function useChat(copilot: Copilot, gateway: ChatGateway) {
  const conversations = ref<Conversation[]>([])
  const current = ref<Conversation | null>(null)
  const messages = ref<StoredMessage[]>([])
  const nextConversation = ref<string | null>(null)
  const before = ref<string | null>(null)
  const loading = ref(true)
  const pending = ref(false)
  const deleting = ref(false)
  const loadingOlder = ref(false)
  const atLatest = ref(true)
  const error = ref('')
  const loadError = ref('')
  const controller = new AbortController()
  let attempt: { id: string; content: string } | undefined
  let selection = 0
  let listVersion = 0
  let disposed = false

  function recoverAttempt(): void {
    const last = messages.value.at(-1)
    if (last?.role === 'user' && last.status !== 'complete') {
      attempt = { id: last.request_id, content: last.content }
      error.value = last.error ?? 'Ответ ещё не получен. Повторите запрос.'
    } else {
      attempt = undefined
      error.value = ''
    }
  }

  async function latest(): Promise<void> {
    if (!current.value) return
    const selected = selection
    const page = await gateway.messages(copilot.id, current.value.id, null, controller.signal)
    if (disposed || selected !== selection) return
    messages.value = page.messages
    before.value = page.next_before
    atLatest.value = true
    recoverAttempt()
  }

  async function select(conversation: Conversation): Promise<void> {
    if (pending.value || deleting.value) return
    const selected = ++selection
    loading.value = true
    loadError.value = ''
    error.value = ''
    attempt = undefined
    current.value = conversation
    messages.value = []
    before.value = null
    try {
      const page = await gateway.messages(copilot.id, conversation.id, null, controller.signal)
      if (disposed || selected !== selection) return
      messages.value = page.messages
      before.value = page.next_before
      atLatest.value = true
      recoverAttempt()
    } catch (failure) {
      if (!disposed && selected === selection)
        loadError.value =
          failure instanceof Error ? failure.message : 'Не удалось загрузить историю.'
    } finally {
      if (!disposed && selected === selection) loading.value = false
    }
  }

  async function listMore(): Promise<void> {
    if (deleting.value) return
    const version = listVersion
    loadError.value = ''
    try {
      const page = await gateway.list(copilot.id, nextConversation.value, controller.signal)
      if (disposed || version !== listVersion) return
      conversations.value = [
        ...new Map(
          [...conversations.value, ...page.conversations].map((item) => [item.id, item]),
        ).values(),
      ]
      nextConversation.value = page.next_before
    } catch (failure) {
      if (!disposed && version === listVersion)
        loadError.value =
          failure instanceof Error ? failure.message : 'Не удалось загрузить диалоги.'
    }
  }

  async function initialize(): Promise<void> {
    await listMore()
    if (conversations.value[0]) await select(conversations.value[0])
    loading.value = false
  }

  async function create(): Promise<void> {
    if (pending.value || loading.value || deleting.value) return
    loadError.value = ''
    loading.value = true
    try {
      const conversation = await gateway.create(copilot.id, controller.signal)
      if (disposed) return
      conversations.value.unshift(conversation)
      await select(conversation)
    } catch (failure) {
      if (!disposed)
        loadError.value = failure instanceof Error ? failure.message : 'Не удалось создать диалог.'
    } finally {
      if (!disposed) loading.value = false
    }
  }

  async function remove(conversation: Conversation): Promise<void> {
    if (pending.value || loading.value || deleting.value) return
    deleting.value = true
    try {
      await gateway.remove(copilot.id, conversation.id, controller.signal)
      if (disposed) return
      listVersion++
      conversations.value = conversations.value.filter((item) => item.id !== conversation.id)
      if (current.value?.id === conversation.id) {
        selection++
        current.value = null
        messages.value = []
        before.value = null
        atLatest.value = true
        attempt = undefined
        error.value = ''
        loadError.value = ''
      }
      // Курсор списка мог ссылаться на удалённый диалог — обновляем первую страницу.
      try {
        const page = await gateway.list(copilot.id, null, controller.signal)
        if (disposed) return
        conversations.value = page.conversations
        nextConversation.value = page.next_before
        if (current.value && !conversations.value.some((item) => item.id === current.value?.id)) {
          conversations.value.push(current.value)
        }
      } catch {
        nextConversation.value = null
        loadError.value = 'Диалог удалён. Не удалось обновить список диалогов.'
      }
    } finally {
      deleting.value = false
    }
    if (!disposed && !current.value && conversations.value[0]) await select(conversations.value[0])
  }

  async function older(): Promise<void> {
    if (!current.value || !before.value || loadingOlder.value || loading.value || pending.value)
      return
    loadingOlder.value = true
    const selected = selection
    try {
      const page = await gateway.messages(
        copilot.id,
        current.value.id,
        before.value,
        controller.signal,
      )
      if (disposed || selected !== selection) return
      const merged = [
        ...new Map([...page.messages, ...messages.value].map((item) => [item.id, item])).values(),
      ]
      if (merged.length > 150) atLatest.value = false
      messages.value = merged.slice(0, 150)
      before.value = page.next_before
    } catch (failure) {
      if (!disposed)
        loadError.value =
          failure instanceof Error ? failure.message : 'Не удалось загрузить сообщения.'
    } finally {
      loadingOlder.value = false
    }
  }

  async function retry(): Promise<void> {
    if (!attempt || !current.value || pending.value || deleting.value || disposed) return
    const sending = { ...attempt }
    pending.value = true
    error.value = ''
    try {
      await gateway.send(
        copilot.id,
        current.value.id,
        sending.id,
        sending.content,
        controller.signal,
      )
      await latest()
      if (!disposed) {
        current.value.title =
          conversations.value.find((item) => item.id === current.value?.id)?.title ===
          'Новый диалог'
            ? sending.content.slice(0, 80)
            : current.value.title
      }
    } catch (failure) {
      if (!disposed) {
        const message =
          failure instanceof Error ? failure.message : 'Не удалось отправить сообщение.'
        try {
          await latest()
        } catch {
          /* Неподтверждённый вопрос остаётся виден до повтора. */
        }
        if (
          messages.value.some((item) => item.request_id === sending.id && item.role === 'assistant')
        ) {
          attempt = undefined
          error.value = ''
          return
        }
        if (!messages.value.some((item) => item.request_id === sending.id)) {
          messages.value.push({
            id: `pending:${sending.id}`,
            request_id: sending.id,
            role: 'user',
            content: sending.content,
            status: 'pending',
            error: message,
            created_at: new Date().toISOString(),
          })
        }
        attempt = sending
        error.value = message
      }
    } finally {
      if (!disposed) pending.value = false
    }
  }

  async function send(content: string): Promise<boolean> {
    const text = content.trim()
    if (!text || text.length > 4000 || pending.value || loading.value || deleting.value || disposed)
      return false
    if (!current.value) await create()
    if (!current.value) return false
    if (!atLatest.value) {
      try {
        await latest()
      } catch {
        loadError.value = 'Не удалось загрузить последние сообщения.'
        return false
      }
    }
    error.value = ''
    attempt = { id: requestId(), content: text }
    messages.value.push({
      id: `pending:${attempt.id}`,
      role: 'user',
      content: text,
      request_id: attempt.id,
      status: 'pending',
      error: null,
      created_at: new Date().toISOString(),
    })
    await retry()
    return true
  }

  onMounted(initialize)
  onBeforeUnmount(() => {
    disposed = true
    controller.abort()
  })
  return {
    conversations,
    current,
    messages,
    nextConversation,
    before,
    loading,
    pending,
    deleting,
    loadingOlder,
    atLatest,
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
  }
}
