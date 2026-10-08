<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, onBeforeUnmount } from 'vue'
import { usePlatform } from './app/context'
import AppHeader from './components/AppHeader.vue'
const { startCatalogPolling, stopCatalogPolling } = usePlatform()
onMounted(startCatalogPolling)
onBeforeUnmount(stopCatalogPolling)
</script>

<template>
  <a class="skip-link" href="#main">Перейти к содержимому</a>
  <AppHeader />
  <main id="main" class="page-container" tabindex="-1">
    <RouterView />
  </main>
  <footer class="app-footer page-container">
    <span>XOps Platform</span>
    <span>Демо-режим · Каталог, статусы, чат и доступ используют mock-данные</span>
  </footer>
</template>
