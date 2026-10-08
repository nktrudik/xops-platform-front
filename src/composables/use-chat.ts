import { onBeforeUnmount, ref } from 'vue'
import type { ChatGateway, ChatMessage, Copilot } from '../domain/copilot'

/** Состояние отдельного чата; незавершённый запрос отменяется при закрытии страницы. */
export function useChat(copilot: Copilot, gateway: ChatGateway) {
  const messages = ref<ChatMessage[]>([])
  const pending = ref(false)
  const error = ref('')
  let controller: AbortController | undefined
  let disposed = false
  let messageSequence = 0

  async function getReply(): Promise<void> {
    if (pending.value || disposed) return
    controller = new AbortController()
    pending.value = true
    error.value = ''
    try {
      const content = await gateway.reply(copilot, [...messages.value], controller.signal)
      if (!disposed)
        messages.value.push({ id: String(++messageSequence), role: 'assistant', content })
    } catch {
      if (!disposed) error.value = 'Не удалось получить ответ. Повторите попытку.'
    } finally {
      if (!disposed) pending.value = false
    }
  }

  async function send(content: string): Promise<boolean> {
    const text = content.trim()
    if (!text || text.length > 4000 || pending.value || error.value || disposed) return false
    messages.value.push({ id: String(++messageSequence), role: 'user', content: text })
    await getReply()
    return true
  }

  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
  })
  return { messages, pending, error, send, retry: getReply }
}
