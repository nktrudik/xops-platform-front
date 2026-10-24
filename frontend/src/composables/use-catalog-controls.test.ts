import { defineComponent, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, expect, it } from 'vitest'
import { testCopilots } from '../../tests/fixtures'
import type { Copilot } from '../domain/copilot'
import { useCatalogControls } from './use-catalog-controls'

let wrapper: VueWrapper | undefined
afterEach(() => wrapper?.unmount())

async function setup(path = '/') {
  const items = ref<readonly Copilot[]>(testCopilots)
  let controls!: ReturnType<typeof useCatalogControls>
  const component = defineComponent({
    setup() {
      controls = useCatalogControls(items)
      return () => null
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component }],
  })
  await router.push(path)
  wrapper = mount(component, { global: { plugins: [router] } })
  return { controls, router, items }
}

it('сочетает фильтры и сохраняет выбор в URL, сбрасывая только фильтры', async () => {
  const { controls, router } = await setup()
  controls.format.value = 'chat'
  await flushPromises()
  expect(controls.results.value).toHaveLength(4)
  controls.availableOnly.value = true
  await flushPromises()
  expect(controls.results.value).toHaveLength(2)
  controls.query.value = 'продаж'
  await flushPromises()
  expect(controls.results.value.map((item) => item.id)).toEqual(['second-chat-test'])
  controls.listView.value = true
  await flushPromises()
  expect(router.currentRoute.value.query).toMatchObject({
    interface: 'chat',
    available: 'true',
    q: 'продаж',
    view: 'list',
  })
  controls.reset()
  await flushPromises()
  expect(controls.results.value).toHaveLength(testCopilots.length)
  expect(router.currentRoute.value.query).toEqual({ view: 'list' })
})

it('отражает новый ответ API и не изменяет исходные данные', async () => {
  const { controls, items } = await setup('/?interface=chat&available=true')
  expect(controls.results.value).toHaveLength(2)
  items.value = []
  expect(controls.counts.value.all).toBe(0)
  expect(controls.results.value).toEqual([])
  items.value = [{ ...testCopilots[2]!, id: 'new-copilot', status: 'unavailable' }]
  expect(controls.counts.value.chat).toBe(1)
  expect(controls.results.value).toEqual([])
  controls.availableOnly.value = false
  await flushPromises()
  expect(controls.results.value[0]?.id).toBe('new-copilot')
  expect(testCopilots[2]?.status).toBe('available')
})

it('безопасно обрабатывает неизвестный формат и повторяющиеся параметры поиска', async () => {
  const { controls } = await setup('/?interface=unknown&q=one&q=two')
  expect(controls.format.value).toBe('all')
  expect(controls.query.value).toBe('')
  expect(controls.results.value).toHaveLength(testCopilots.length)
})
