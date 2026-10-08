<script setup lang="ts">
import { usePlatform } from '../app/context'
const { error, hasLoaded, loadCatalog } = usePlatform()
</script>

<template>
  <div v-if="error && hasLoaded" class="catalog-notice surface" role="status">
    <span>{{ error }} Показаны последние полученные данные.</span>
    <button class="text-button" @click="loadCatalog">Повторить попытку</button>
  </div>
</template>

<style scoped>
.catalog-notice {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  margin: 20px 0;
  color: var(--text-secondary);
}
</style>
