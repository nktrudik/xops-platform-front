<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { usePlatform } from '../app/context'
import AppBrand from './AppBrand.vue'
import AppIcon from './AppIcon.vue'
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { copilots, hasLoaded } = usePlatform()
const formats = computed(() => [
  {
    id: 'chat',
    title: 'Универсальный чат',
    icon: 'chat' as const,
    count: copilots.value.filter((item) => item.interfaceType === 'chat').length,
  },
  {
    id: 'embedded',
    title: 'Встроенные приложения',
    icon: 'layers' as const,
    count: copilots.value.filter((item) => item.interfaceType === 'embedded').length,
  },
  {
    id: 'external',
    title: 'Внешние продукты',
    icon: 'external' as const,
    count: copilots.value.filter((item) => item.interfaceType === 'external').length,
  },
])
</script>
<template>
  <aside class="app-sidebar" aria-label="Навигация платформы">
    <div class="sidebar-brand"><AppBrand /><slot /></div>
    <div class="workspace-label">
      <span class="workspace-monogram">М</span
      ><span><b>Пространство МТС</b><small>Корпоративная AI-платформа</small></span>
    </div>
    <nav class="sidebar-nav" aria-label="Основная навигация">
      <span class="sidebar-label">Рабочее пространство</span>
      <RouterLink
        to="/"
        class="sidebar-link"
        :class="{ active: route.name === 'home' }"
        :aria-current="route.name === 'home' ? 'page' : undefined"
        @click="emit('navigate')"
        ><AppIcon name="home" /><span>Главная</span></RouterLink
      >
      <RouterLink
        :to="{ name: 'catalog' }"
        class="sidebar-link"
        :class="{ active: route.name === 'catalog' && !route.query.interface }"
        :aria-current="route.name === 'catalog' && !route.query.interface ? 'page' : undefined"
        @click="emit('navigate')"
        ><AppIcon name="grid" /><span>Каталог Copilot</span
        ><small v-if="hasLoaded">{{ copilots.length }}</small></RouterLink
      >
      <span class="sidebar-label sidebar-formats-label">Форматы работы</span>
      <RouterLink
        v-for="format in formats"
        :key="format.id"
        :to="{ name: 'catalog', query: { interface: format.id } }"
        class="sidebar-link format-link"
        :class="{ active: route.name === 'catalog' && route.query.interface === format.id }"
        :aria-current="
          route.name === 'catalog' && route.query.interface === format.id ? 'page' : undefined
        "
        @click="emit('navigate')"
        ><AppIcon :name="format.icon" /><span>{{ format.title }}</span
        ><small v-if="hasLoaded">{{ format.count }}</small></RouterLink
      >
    </nav>
    <div class="sidebar-footer">
      <span class="sidebar-footer-icon"><AppIcon name="sparkles" /></span>
      <div>
        <b>Больше возможностей.<br />Меньше рутины.</b>
        <p>AI-инструменты команд МТС<br />в одном пространстве.</p>
      </div>
    </div>
    <div class="sidebar-signature"><span>XOps Platform</span><span>МТС</span></div>
  </aside>
</template>
<style scoped>
.app-sidebar {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 28px 16px max(20px, env(safe-area-inset-bottom));
  background: var(--sidebar);
  color: white;
}
.sidebar-brand {
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.workspace-label {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #41444c;
  background: #292c33;
  border-radius: 8px;
  padding: 12px 10px;
  margin: 28px 4px 32px;
}
.workspace-monogram {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #555963;
  border-radius: 6px;
  font: 500 12px var(--font-heading);
}
.workspace-label b {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.workspace-label small {
  display: block;
  font-size: 10px;
  color: var(--sidebar-text);
  margin-top: 5px;
}
.sidebar-nav {
  display: grid;
  gap: 4px;
}
.sidebar-label {
  padding: 0 12px;
  margin-bottom: 10px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: var(--sidebar-text);
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 12px;
  border-radius: 7px;
  color: var(--sidebar-text);
  font-size: 12px;
  position: relative;
  transition:
    background 160ms,
    color 160ms;
}
.sidebar-link > svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.sidebar-link > small {
  margin-left: auto;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: #c3c6cd;
}
.sidebar-link:hover {
  background: #2c2f36;
  color: white;
}
.sidebar-link.active {
  background: #373a42;
  color: white;
}
.sidebar-link.active::before {
  content: '';
  position: absolute;
  width: 3px;
  top: 14px;
  bottom: 14px;
  left: 0;
  border-radius: 2px;
  background: #ff3540;
}
.sidebar-link.active > svg {
  color: #ff6b73;
}
.sidebar-formats-label {
  margin-top: 32px;
}
.format-link {
  font-size: 11px;
  gap: 10px;
}
.sidebar-footer {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: auto 8px 28px;
  padding-top: 64px;
}
.sidebar-footer-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: #d7d9df;
  flex-shrink: 0;
}
.sidebar-footer-icon svg {
  width: 20px;
  height: 20px;
}
.sidebar-footer b {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.7;
}
.sidebar-footer p {
  color: var(--sidebar-text);
  font-size: 11px;
  line-height: 1.7;
  margin-bottom: 0;
}
.sidebar-signature {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #3b3e46;
  padding: 18px 12px 0;
  color: var(--sidebar-text);
  font-size: 9px;
}
@media (max-height: 740px) {
  .app-sidebar {
    overflow-y: auto;
  }
  .sidebar-footer {
    padding-top: 28px;
  }
}
</style>
