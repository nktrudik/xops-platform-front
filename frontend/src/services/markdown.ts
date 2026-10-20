import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true })

markdown.renderer.rules.link_open = (tokens, index, options, _environment, renderer) => {
  tokens[index]!.attrSet('target', '_blank')
  tokens[index]!.attrSet('rel', 'noopener noreferrer')
  return renderer.renderToken(tokens, index, options)
}

/** Преобразует Markdown в HTML, экранируя исходный HTML и запрещая опасные URL. */
export function renderMarkdown(content: string): string {
  return markdown.render(content)
}
