<script setup lang="ts">
export type IconName =
  | 'sparkles'
  | 'code'
  | 'layers'
  | 'document'
  | 'chart'
  | 'compass'
  | 'arrow'
  | 'search'
  | 'close'
  | 'home'
  | 'chevron'
  | 'chat'
  | 'send'
  | 'refresh'
  | 'alert'
defineProps<{ name: IconName }>()

const paths: Record<IconName, string> = {
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3M20 2v4m-2-2h4',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  layers: 'm12 3 10 5-10 5L2 8l10-5M2 12l10 5 10-5M2 16l10 5 10-5',
  document: 'M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h6',
  chart: 'M3 3v18h18M8 16v-5m5 5V6m5 10V9',
  compass: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-6-4-3 5-5 3 3-5 5-3Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  close: 'm6 6 12 12M6 18 18 6',
  home: 'm3 10 9-8 9 8M5 8v13h14V8M9 21v-7h6v7',
  chevron: 'm9 5 7 7-7 7',
  chat: 'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 10h8m-8 4h5',
  send: 'm3 3 18 9-18 9 3-9-3-9Zm3 9h15',
  refresh: 'M20 7V2m0 5h-5M4 17v5m0-5h5M4 8a9 9 0 0 1 16-1M20 16a9 9 0 0 1-16 1',
  alert: 'm12 3 10 18H2L12 3Zm0 5v6m0 3v.1',
}
</script>

<template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
