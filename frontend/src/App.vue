<script setup lang="ts">
import { RouterView } from 'vue-router'
import { watch, onBeforeUnmount } from 'vue'
import { router } from './app/router'
import { session } from './services/api'
import { usePlatform } from './app/context'
import AppHeader from './components/AppHeader.vue'
const { startCatalogPolling, stopCatalogPolling, clearCatalog } = usePlatform()
watch(
  session,
  (user) => {
    if (user) startCatalogPolling()
    else {
      stopCatalogPolling()
      clearCatalog()
      if (router.currentRoute.value.name && router.currentRoute.value.name !== 'login')
        void router.replace({ name: 'login' })
    }
  },
  { immediate: true },
)
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
    <span>Каталог Copilot · XOps Platform</span>
  </footer>
</template>
