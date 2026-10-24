<script setup lang="ts">
import { RouterView } from 'vue-router'
import { watch, onBeforeUnmount, shallowRef } from 'vue'
import { router } from './app/router'
import { session } from './services/api'
import { usePlatform } from './app/context'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import MobileNavigation from './components/MobileNavigation.vue'
import './styles/app-shell.css'
const navigationOpen = shallowRef(false)
watch(
  () => router.currentRoute.value.fullPath,
  () => {
    navigationOpen.value = false
  },
)
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
  <div class="application" :class="{ 'application-signed-in': session }">
    <AppSidebar v-if="session" class="desktop-sidebar" />
    <div class="application-workspace">
      <AppHeader class="workspace-header" @open-navigation="navigationOpen = true" />
      <main id="main" class="workspace-main" tabindex="-1"><RouterView /></main>
      <footer class="workspace-footer">
        <span translate="no">XOps Platform</span><span>AI-инструменты команд МТС</span>
      </footer>
    </div>
    <MobileNavigation v-if="session" v-model="navigationOpen" />
  </div>
</template>
