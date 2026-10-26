import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPlatformServices, platformKey } from '../app/context'
import { testCopilots } from '../../tests/fixtures'
import { createChatGateway } from '../services/chat'
import type { Copilot, ChatGateway, StoredMessage } from '../domain/copilot'
import CatalogView from '../views/CatalogView.vue'
import ChatPanel from './ChatPanel.vue'
import EmbeddedApp from './EmbeddedApp.vue'

const wrappers: VueWrapper[] = []
const showModal = HTMLDialogElement.prototype.showModal
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
})
afterAll(() => {
  HTMLDialogElement.prototype.showModal = showModal
})
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers.length = 0
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function catalogMount(items: readonly Copilot[] = testCopilots, failure = false) {
  const services = createPlatformServices(
    {
      list: async () => {
        if (failure) throw new Error('Сбой')
        return items
      },
    },
    createChatGateway(),
  )
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: CatalogView },
      { path: '/copilots/:id', name: 'copilot', component: ChatPanel },
    ],
  })
  await router.push('/')
  const wrapper = mount(CatalogView, {
    global: { plugins: [router], provide: { [platformKey as symbol]: services } },
  })
  wrappers.push(wrapper)
  await services.loadCatalog()
  await flushPromises()
  return { wrapper, services, router }
}

describe('Каталог', () => {
  it('рисует добавленный Copilot без изменения компонентов и ищет по данным', async () => {
    const added = { ...testCopilots[1]!, id: 'new', name: 'Новый инструмент' }
    const { wrapper } = await catalogMount([...testCopilots, added])
    expect(wrapper.findAll('article')).toHaveLength(7)
    expect(wrapper.find('a[href="/copilots/new"]').exists()).toBe(true)
    await wrapper.get('input').setValue('новый')
    expect(wrapper.findAll('article')).toHaveLength(1)
    await wrapper.get('input').setValue('ничего такого')
    expect(wrapper.text()).toContain('Ничего не найдено')
  })

  it('показывает пустой каталог и ошибку загрузки', async () => {
    expect((await catalogMount([])).wrapper.text()).toContain('В каталоге пока нет Copilot')
    const { wrapper } = await catalogMount([], true)
    expect(wrapper.text()).toContain('Каталог недоступен')
    expect(wrapper.get('.state-panel button.button-primary').text()).toContain('Повторить')
  })

  it('не создаёт ссылки открытия для недоступных Copilot', async () => {
    const { wrapper } = await catalogMount()
    expect(wrapper.find('a[href="/copilots/maintenance-test"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/copilots/upcoming-test"]').exists()).toBe(false)
  })

  it('совмещает формат с поиском и восстанавливает фильтры из URL', async () => {
    const { wrapper, router } = await catalogMount()
    const chatFilter = wrapper
      .findAll('.format-filter')
      .find((button) => button.text().startsWith('Чат'))!
    await chatFilter.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(4)
    expect(router.currentRoute.value.query.format).toBe('chat')
    await wrapper.get('input').setValue('продажам')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.text()).toContain('Второй чат')
    expect(router.currentRoute.value.query.q).toBe('продажам')
    await router.push('/?format=external&q=файлов')
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('файлов')
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.get('article').text()).toContain('Внешний сервис')
    await wrapper.get('.filter-reset').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(6)
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('сохраняет выбранный формат, если его удалило обновление каталога', async () => {
    const { wrapper, services, router } = await catalogMount()
    await router.push('/?format=embedded')
    await flushPromises()
    services.copilots.value = testCopilots.filter((copilot) => copilot.interfaceType !== 'embedded')
    await flushPromises()
    expect(wrapper.text()).toContain('Ничего не найдено')
    expect(wrapper.get('.format-filter[aria-pressed="true"]').text()).toContain('Встроенный UI0')
    expect(router.currentRoute.value.query.format).toBe('embedded')
  })
})

describe('Чат', () => {
  it('отправляет запрос, безопасно отображает текст и повторяет неудачный ответ', async () => {
    const conversation = {
      id: 'dialog',
      title: 'Новый диалог',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }
    let messages: StoredMessage[] = []
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('Сбой'))
      .mockImplementation(async () => {
        messages = [
          {
            id: '1',
            request_id: 'request',
            role: 'user',
            content: 'Как решить задачу?',
            status: 'complete',
            error: null,
            created_at: '2026-01-01',
          },
          {
            id: '2',
            request_id: 'request',
            role: 'assistant',
            content: 'Ответ <script>alert(1)</script>',
            status: 'complete',
            error: null,
            created_at: '2026-01-01',
          },
        ]
      })
    const gateway: ChatGateway = {
      list: async () => ({ conversations: [], next_before: null }),
      create: async () => conversation,
      remove: async () => {},
      messages: async () => ({ messages, next_before: null }),
      send,
    }
    const services = createPlatformServices({ list: async () => [] }, gateway)
    const wrapper = mount(ChatPanel, {
      props: { copilot: testCopilots[2]! },
      global: { provide: { [platformKey as symbol]: services } },
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('textarea').setValue('Как решить задачу?')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Сбой')
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    await wrapper.get('.chat-error button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.message-user')).toHaveLength(1)
    expect(wrapper.text()).toContain('Ответ <script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })

  it('позволяет продолжить восстановленный диалог после ошибки копилота', async () => {
    const conversation = {
      id: 'dialog',
      title: 'Разговор',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }
    const saved: StoredMessage[] = [
      {
        id: '1',
        request_id: 'failed-request',
        role: 'user',
        content: 'Неудачный вопрос',
        status: 'failed',
        error: 'API Copilot вернул HTTP 500',
        created_at: '2026-01-01',
      },
    ]
    const send = vi.fn(async (_copilot: string, _dialog: string, key: string, content: string) => {
      saved.push(
        { ...saved[0]!, id: '2', request_id: key, content, status: 'complete', error: null },
        {
          ...saved[0]!,
          id: '3',
          request_id: key,
          role: 'assistant',
          content: 'Новый ответ',
          status: 'complete',
          error: null,
        },
      )
    })
    const gateway: ChatGateway = {
      list: async () => ({ conversations: [conversation], next_before: null }),
      create: async () => conversation,
      remove: async () => {},
      messages: async () => ({ messages: structuredClone(saved), next_before: null }),
      send,
    }
    const wrapper = mount(ChatPanel, {
      props: { copilot: testCopilots[2]! },
      global: {
        provide: {
          [platformKey as symbol]: createPlatformServices({ list: async () => [] }, gateway),
        },
      },
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    await wrapper.get('textarea').setValue('Новый вопрос')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[2]).not.toBe('failed-request')
    expect(wrapper.findAll('.message-user')).toHaveLength(2)
    expect(wrapper.text()).toContain('Новый ответ')
    expect(wrapper.find('.chat-error').exists()).toBe(false)
    expect(wrapper.find('.message-failed').text()).toContain('HTTP 500')
  })

  it('подтверждает удаление, сохраняет диалог при ошибке и переключается после успеха', async () => {
    const first = {
      id: 'first',
      title: 'Первый диалог',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }
    const second = { ...first, id: 'second', title: 'Второй диалог' }
    let dialogs = [first, second]
    const remove = vi
      .fn()
      .mockRejectedValueOnce(new Error('Не удалось удалить'))
      .mockImplementation(async (_copilot: string, id: string) => {
        dialogs = dialogs.filter((item) => item.id !== id)
      })
    const gateway: ChatGateway = {
      list: async () => ({ conversations: structuredClone(dialogs), next_before: null }),
      create: async () => first,
      remove,
      messages: async (_copilot, id) => ({
        messages: [
          {
            id: '1',
            request_id: 'key',
            role: 'assistant',
            content: `История ${id}`,
            status: 'complete',
            error: null,
            created_at: '2026-01-01',
          },
        ],
        next_before: null,
      }),
      send: async () => {},
    }
    const wrapper = mount(ChatPanel, {
      attachTo: document.body,
      props: { copilot: testCopilots[2]! },
      global: {
        provide: {
          [platformKey as symbol]: createPlatformServices({ list: async () => [] }, gateway),
        },
      },
    })
    wrappers.push(wrapper)
    await flushPromises()
    await wrapper.get('.dialog-delete').trigger('click')
    await wrapper.get('.delete-cancel').trigger('click')
    expect(remove).not.toHaveBeenCalled()
    await wrapper.get('.dialog-delete').trigger('click')
    await wrapper.get('dialog .button-primary').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Не удалось удалить')
    expect(wrapper.findAll('.dialog-row')).toHaveLength(2)
    await wrapper.get('dialog .button-primary').trigger('click')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.findAll('.dialog-row')).toHaveLength(1)
    expect(wrapper.text()).toContain('История second')
    await wrapper.get('.dialog-delete').trigger('click')
    await wrapper.get('dialog .button-primary').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.dialog-row')).toHaveLength(0)
    expect(wrapper.findAll('.message')).toHaveLength(0)
    expect(wrapper.text()).toContain('С чего начнём?')
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
  })
})

describe('Встроенное приложение', () => {
  const copilot: Extract<Copilot, { interfaceType: 'embedded' }> = {
    id: 'iframe',
    name: 'Приложение',
    description: '',
    status: 'available',
    icon: 'layers',
    interfaceType: 'embedded',
    applicationUrl: 'https://example.test/app',
  }

  function embedMount(
    embedding: ReturnType<typeof createPlatformServices>['embedding'],
    entry = copilot,
  ) {
    const services = createPlatformServices(
      { list: async () => [] },
      createChatGateway(),
      embedding,
    )
    const wrapper = mount(EmbeddedApp, {
      props: { copilot: entry },
      global: { provide: { [platformKey as symbol]: services } },
    })
    wrappers.push(wrapper)
    return wrapper
  }

  it('показывает запрет встраивания без пустого iframe', async () => {
    const wrapper = embedMount(async () => ({
      state: 'blocked',
      reason: 'Запрещено политикой сервиса',
    }))
    await flushPromises()
    expect(wrapper.text()).toContain('Запрещено политикой сервиса')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('обрабатывает таймаут iframe и повторную загрузку', async () => {
    vi.useFakeTimers()
    const wrapper = embedMount(async () => ({ state: 'ready' }))
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(15000)
    expect(wrapper.text()).toContain('не ответило вовремя')
    await wrapper.get('.state-panel button').trigger('click')
    await flushPromises()
    await wrapper.get('iframe').trigger('load')
    expect(wrapper.find('.frame-loading').exists()).toBe(false)
    expect(wrapper.text()).toContain('Приложение не отображается')
  })

  it('кнопка повторной загрузки меняет URL документа iframe', async () => {
    const wrapper = embedMount(async () => ({ state: 'ready' }))
    await flushPromises()
    const firstUrl = wrapper.get('iframe').attributes('src')
    await wrapper.get('iframe').trigger('load')
    await wrapper.get('.panel-toolbar button').trigger('click')
    await flushPromises()
    const secondUrl = wrapper.get('iframe').attributes('src')
    expect(secondUrl).not.toBe(firstUrl)
    expect(new URL(secondUrl!).pathname).toBe('/app')
  })

  it('обрабатывает ошибку проверки доступности', async () => {
    const wrapper = embedMount(async () => {
      throw new Error('Сеть')
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Не удалось связаться')
  })
})
