<script setup lang="ts">
import AppIcon from './AppIcon.vue'
defineProps<{ title: string; description?: string; loading?: boolean }>()
</script>

<template>
  <section class="state-panel surface" :role="loading ? 'status' : undefined" :aria-busy="loading">
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <span v-else class="icon-tile"><AppIcon name="alert" /></span>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
    <slot />
  </section>
</template>
