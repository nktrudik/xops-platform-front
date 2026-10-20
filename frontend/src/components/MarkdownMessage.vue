<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../services/markdown'

const props = defineProps<{ content: string }>()
const rendered = computed(() => renderMarkdown(props.content))
</script>

<template>
  <!-- Исходный HTML экранируется Markdown-парсером; разрешена только его разметка. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-message" v-html="rendered" />
</template>

<style scoped>
.markdown-message {
  margin-top: 8px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.markdown-message :deep(> :first-child) {
  margin-top: 0;
}
.markdown-message :deep(> :last-child) {
  margin-bottom: 0;
}
.markdown-message :deep(p) {
  margin: 0 0 12px;
}
.markdown-message :deep(h1),
.markdown-message :deep(h2),
.markdown-message :deep(h3),
.markdown-message :deep(h4),
.markdown-message :deep(h5),
.markdown-message :deep(h6) {
  margin: 22px 0 10px;
  font-size: 1.1em;
  line-height: 1.35;
}
.markdown-message :deep(h1) {
  font-size: 1.4em;
}
.markdown-message :deep(h2) {
  font-size: 1.25em;
}
.markdown-message :deep(ul),
.markdown-message :deep(ol) {
  margin: 10px 0 16px;
  padding-left: 26px;
}
.markdown-message :deep(li + li) {
  margin-top: 6px;
}
.markdown-message :deep(li > p) {
  margin-bottom: 6px;
}
.markdown-message :deep(li > ul),
.markdown-message :deep(li > ol) {
  margin: 6px 0;
}
.markdown-message :deep(a) {
  color: var(--red);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.markdown-message :deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.9em;
  background: var(--white);
  border-radius: 5px;
  padding: 2px 5px;
}
.markdown-message :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--white);
  white-space: pre;
  overflow-wrap: normal;
  line-height: 1.5;
}
.markdown-message :deep(pre code) {
  padding: 0;
  background: transparent;
}
.markdown-message :deep(blockquote) {
  margin: 16px 0;
  padding: 4px 16px;
  border-left: 3px solid var(--red);
  color: var(--text-secondary);
}
.markdown-message :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 16px 0;
}
.markdown-message :deep(th),
.markdown-message :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
.markdown-message :deep(th) {
  background: var(--white);
}
.markdown-message :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}
.markdown-message :deep(hr) {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 20px 0;
}
</style>
