import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MarkdownMessage from './MarkdownMessage.vue'

describe('Markdown в ответах копилота', () => {
  it('отображает заголовки, выделение, абзацы и списки из ответа модели', () => {
    const wrapper = mount(MarkdownMessage, {
      props: {
        content: `Приветик! 😊 Я — **XOps Assistant**.

## 🤖 Что я умею

1. Рассказывать о платформе
2. Объяснять типы Copilot-ов:
   - Embedded UI
   - Универсальный *Chat UI*

## 💡 Суть

Все помощники в одном пространстве.
Есть вопрос?`,
      },
    })
    expect(wrapper.get('strong').text()).toBe('XOps Assistant')
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      '🤖 Что я умею',
      '💡 Суть',
    ])
    expect(wrapper.findAll('ol > li')).toHaveLength(2)
    expect(wrapper.findAll('ol ul > li')).toHaveLength(2)
    expect(wrapper.get('em').text()).toBe('Chat UI')
    expect(wrapper.findAll('br')).toHaveLength(1)
  })

  it('сохраняет код дословно и отображает таблицы и цитаты', () => {
    const wrapper = mount(MarkdownMessage, {
      props: {
        content:
          '`messages`\n\n```python\nif a < b:\n    print("**текст**")\n```\n\n> Цитата\n\n| Тип | Режим |\n| --- | --- |\n| Chat | API |',
      },
    })
    expect(wrapper.get('pre code').element.textContent).toBe('if a < b:\n    print("**текст**")\n')
    expect(wrapper.get('pre code').classes()).toContain('language-python')
    expect(wrapper.get('blockquote').text()).toBe('Цитата')
    expect(wrapper.findAll('th')).toHaveLength(2)
    expect(wrapper.findAll('td').map((cell) => cell.text())).toEqual(['Chat', 'API'])
    expect(wrapper.find('strong').exists()).toBe(false)
  })

  it('экранирует HTML и блокирует опасные ссылки и изображения', () => {
    const content = `<script>alert(1)</script>

<img src=x onerror="alert(1)">

[опасно](javascript:alert%281%29)
[опасно](jav&#x61;script:alert%281%29)
[опасно](data:text/html;base64,PHNjcmlwdD4=)
![опасно](javascript:alert%281%29)

**Безопасный текст**`
    const wrapper = mount(MarkdownMessage, { props: { content } })
    expect(wrapper.find('script, img, iframe, a, [onerror]').exists()).toBe(false)
    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    expect(wrapper.get('strong').text()).toBe('Безопасный текст')
  })

  it('открывает безопасные ссылки отдельно и обновляет форматирование при смене текста', async () => {
    const wrapper = mount(MarkdownMessage, {
      props: { content: '[Документация](https://example.com/docs?q=1&lang=ru)' },
    })
    expect(wrapper.get('a').attributes()).toMatchObject({
      href: 'https://example.com/docs?q=1&lang=ru',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
    await wrapper.setProps({ content: '## Новый ответ' })
    expect(wrapper.get('h2').text()).toBe('Новый ответ')
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
