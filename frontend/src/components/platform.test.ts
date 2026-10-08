import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPlatformServices, platformKey } from '../app/context'
import { mockCopilots } from '../../tests/fixtures'
import { createMockChatGateway } from '../services/mock-chat'
import type { Copilot } from '../domain/copilot'
import CatalogView from '../views/CatalogView.vue'
import ChatPanel from './ChatPanel.vue'
import EmbeddedApp from './EmbeddedApp.vue'

const wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  wrappers.length = 0
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function catalogMount(items: readonly Copilot[] = mockCopilots, failure = false) {
  const services = createPlatformServices(
    {
      list: async () => {
        if (failure) throw new Error('Сбой')
        return items
      },
    },
    createMockChatGateway(0),
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
  return { wrapper, services }
}

describe('Каталог', () => {
  it('рисует добавленный Copilot без изменения компонентов и ищет по данным', async () => {
    const added = { ...mockCopilots[1]!, id: 'new', name: 'Новый инструмент' }
    const { wrapper } = await catalogMount([...mockCopilots, added])
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
    expect(wrapper.find('a[href="/copilots/analytics-copilot"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/copilots/research-copilot"]').exists()).toBe(false)
  })
})

describe('Чат', () => {
  it('отправляет запрос, безопасно отображает текст и повторяет неудачный ответ', async () => {
    vi.stubGlobal('crypto', {})
    const reply = vi
      .fn()
      .mockRejectedValueOnce(new Error('Сбой'))
      .mockResolvedValue('Ответ <script>alert(1)</script>')
    const services = createPlatformServices({ list: async () => [] }, { reply })
    const wrapper = mount(ChatPanel, {
      props: { copilot: mockCopilots[2]! },
      global: { provide: { [platformKey as symbol]: services } },
    })
    wrappers.push(wrapper)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('textarea').setValue('Как решить задачу?')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Не удалось получить ответ')
    await wrapper.get('.chat-error button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.message-user')).toHaveLength(1)
    expect(wrapper.text()).toContain('Ответ <script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
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
      createMockChatGateway(),
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
