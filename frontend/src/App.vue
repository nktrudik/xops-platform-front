<script setup lang="ts">
import { RouterView } from 'vue-router'
import { watch, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { router } from './app/router'
import { session } from './services/api'
import { localPreview } from './app/local-preview'
import { usePlatform } from './app/context'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import MobileNavigation from './components/MobileNavigation.vue'
import CommandPalette from './components/CommandPalette.vue'
import './styles/app-shell.css'
const navigationOpen = shallowRef(false)
const commandOpen = shallowRef(false)
const sidebarCollapsed = shallowRef(false)
function onShortcut(event: KeyboardEvent): void {
  if (event.repeat || event.isComposing) return
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k' &&
    (session.value || localPreview)
  ) {
    event.preventDefault()
    navigationOpen.value = false
    commandOpen.value = !commandOpen.value
  }
}
onMounted(() => window.addEventListener('keydown', onShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', onShortcut))
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
    if (user || localPreview) startCatalogPolling()
    else {
      commandOpen.value = false
      navigationOpen.value = false
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
  <div
    class="application"
    :class="{
      'application-signed-in': session || localPreview,
      'application-collapsed': sidebarCollapsed,
    }"
  >
    <AppSidebar
      v-if="session || localPreview"
      class="desktop-sidebar"
      :collapsed="sidebarCollapsed"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
    />
    <div class="application-workspace">
      <AppHeader
        class="workspace-header"
        @open-navigation="navigationOpen = true"
        @open-command="commandOpen = true"
      />
      <main id="main" class="workspace-main" tabindex="-1">
        <RouterView v-slot="{ Component, route }"
          ><Transition name="workspace-page" mode="out-in"
            ><component :is="Component" :key="route.path" /></Transition
        ></RouterView>
      </main>
      <footer class="workspace-footer">
        <span translate="no">XOps Platform</span><span>AI-инструменты команд МТС</span>
      </footer>
    </div>
    <MobileNavigation v-if="session || localPreview" v-model="navigationOpen" />
    <CommandPalette v-if="session || localPreview" v-model="commandOpen" />
  </div>
</template>
