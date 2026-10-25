<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { usePlatform } from '../app/context'
import AppBrand from './AppBrand.vue'
import AppIcon from './AppIcon.vue'
const props = defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: []; toggle: [] }>()
const route = useRoute()
const { copilots, hasLoaded } = usePlatform()
const navigation = useTemplateRef<HTMLElement>('navigation')
const markerY = shallowRef(0)
const markerVisible = shallowRef(false)
async function updateMarker(): Promise<void> {
  await nextTick()
  const active = navigation.value?.querySelector<HTMLElement>('.sidebar-link.active')
  markerVisible.value = !!active
  if (active) markerY.value = active.offsetTop + (active.offsetHeight - 20) / 2
}
watch(() => [route.name, route.fullPath, props.collapsed], updateMarker, { flush: 'post' })
let observer: ResizeObserver | undefined
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && navigation.value) {
    observer = new ResizeObserver(() => void updateMarker())
    observer.observe(navigation.value)
  }
  void updateMarker()
})
onBeforeUnmount(() => observer?.disconnect())
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
  <aside
    class="app-sidebar"
    :class="{ 'sidebar-collapsed': collapsed }"
    aria-label="Навигация платформы"
  >
    <div class="sidebar-brand"><AppBrand :compact="collapsed" /><slot /></div>
    <button
      class="sidebar-collapse"
      :aria-label="collapsed ? 'Развернуть навигацию' : 'Свернуть навигацию'"
      :title="collapsed ? 'Развернуть навигацию' : 'Свернуть навигацию'"
      :aria-expanded="!collapsed"
      @click="emit('toggle')"
    >
      <AppIcon name="chevron" />
    </button>
    <div class="workspace-label">
      <span class="workspace-monogram">М</span
      ><span><b>Пространство МТС</b><small>Корпоративная AI-платформа</small></span>
    </div>
    <nav ref="navigation" class="sidebar-nav" aria-label="Основная навигация">
      <span
        class="sidebar-active-marker"
        :class="{ 'marker-visible': markerVisible }"
        :style="{ transform: `translateY(${markerY}px)` }"
        aria-hidden="true"
      />
      <span class="sidebar-label">Рабочее пространство</span>
      <RouterLink
        to="/"
        title="Главная"
        aria-label="Главная"
        class="sidebar-link"
        :class="{ active: route.name === 'home' }"
        :aria-current="route.name === 'home' ? 'page' : undefined"
        @click="emit('navigate')"
        ><AppIcon name="home" /><span>Главная</span></RouterLink
      >
      <RouterLink
        :to="{ name: 'catalog' }"
        title="Каталог Copilot"
        aria-label="Каталог Copilot"
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
        :title="format.title"
        :aria-label="format.title"
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 16px max(20px, env(safe-area-inset-bottom));
  background: var(--sidebar);
  color: white;
}
.sidebar-brand,
.workspace-label,
.sidebar-footer,
.sidebar-signature {
  flex-shrink: 0;
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
  flex-shrink: 0;
  border: 1px solid #555963;
  border-radius: 6px;
  font: 500 12px var(--font-heading);
}
.workspace-label > span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.workspace-label b {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.workspace-label small {
  display: block;
  font-size: 10px;
  color: #c5c8d0;
  margin-top: 5px;
}
.sidebar-nav {
  position: relative;
  display: grid;
  flex: 1;
  min-height: 0;
  min-width: 0;
  align-content: start;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  container-type: inline-size;
  gap: 4px;
}
.sidebar-active-marker {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 20px;
  background: #ff3540;
  border-radius: 2px;
  pointer-events: none;
  opacity: 0;
  transition:
    transform 250ms cubic-bezier(0.22, 0.7, 0.2, 1),
    opacity 180ms;
  z-index: 1;
}
.marker-visible {
  opacity: 1;
}
.sidebar-collapse {
  display: none;
  position: absolute;
  right: -12px;
  top: 88px;
  z-index: 2;
  width: 24px;
  height: 24px;
  border: 1px solid #d6d9e0;
  border-radius: 7px;
  background: #fff;
  color: #616674;
  padding: 4px;
  box-shadow: 0 2px 6px rgb(0 0 0 / 8%);
  transition:
    background 180ms,
    color 180ms;
}
.sidebar-collapse > svg {
  width: 14px;
  height: 14px;
  transform: rotate(180deg);
  transition: transform 220ms;
}
.sidebar-collapse:hover {
  background: var(--red);
  color: white;
  border-color: var(--red);
}
.desktop-sidebar .sidebar-collapse {
  display: grid;
  place-items: center;
}
.sidebar-collapsed .sidebar-collapse > svg {
  transform: rotate(0);
}
.sidebar-collapsed {
  padding-inline: 12px;
}
.sidebar-collapsed .sidebar-brand {
  padding-inline: 9px;
}
.sidebar-collapsed .workspace-label {
  width: 40px;
  padding: 4px;
  margin-inline: 8px;
  border-color: transparent;
  background: none;
}
.sidebar-collapsed .workspace-label > span:last-child {
  display: none;
}
.sidebar-collapsed .workspace-monogram {
  flex-shrink: 0;
}
.sidebar-collapsed .sidebar-link {
  justify-content: center;
  padding-inline: 8px;
}
.sidebar-collapsed .sidebar-link > span,
.sidebar-collapsed .sidebar-link > small {
  display: none;
}
.sidebar-collapsed .sidebar-label {
  overflow: hidden;
  white-space: nowrap;
  color: transparent;
  padding-inline: 0;
}
.sidebar-collapsed .sidebar-footer {
  display: none;
}
.sidebar-collapsed .sidebar-signature {
  padding-inline: 0;
  justify-content: center;
}
.sidebar-collapsed .sidebar-signature > span:last-child {
  display: none;
}
.sidebar-collapsed .sidebar-signature > span:first-child {
  font-size: 8px;
  white-space: nowrap;
}
.sidebar-label {
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 0 12px;
  margin-bottom: 10px;
  font-size: 10px;
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
  font-size: 14px;
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
.sidebar-link > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.sidebar-link > small {
  margin-left: auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #c3c6cd;
}
.sidebar-link:hover {
  background: #2c2f36;
  color: white;
}
.sidebar-link:focus-visible {
  outline-offset: -3px;
}
.sidebar-link.active {
  background: linear-gradient(100deg, #592b34, #37323b);
  color: white;
  box-shadow: inset 0 0 0 1px #e3061126;
}
.sidebar-link.active > svg {
  color: #ff8690;
}
.sidebar-formats-label {
  margin-top: 32px;
}
.format-link {
  font-size: 13px;
  gap: 10px;
}
.sidebar-footer {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: auto 8px 28px;
  padding-top: 40px;
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
/* Keep the icon rail until the expanding sidebar has room for labels and counts. */
@container (max-width: 120px) {
  .sidebar-link {
    justify-content: center;
    padding-inline: 6px;
  }
  .sidebar-link > span,
  .sidebar-link > small {
    display: none;
  }
  .sidebar-label {
    white-space: nowrap;
    overflow: hidden;
    color: transparent;
  }
}
@media (max-height: 800px) {
  .app-sidebar {
    padding-block: 20px max(16px, env(safe-area-inset-bottom));
  }
  .workspace-label {
    margin-block: 20px 24px;
  }
  .sidebar-footer {
    display: none;
  }
  .sidebar-signature {
    padding-top: 14px;
  }
}
@media (max-height: 600px) {
  .app-sidebar {
    padding-block: 16px max(12px, env(safe-area-inset-bottom));
  }
  .workspace-label {
    margin-block: 14px 16px;
  }
  .sidebar-formats-label {
    margin-top: 20px;
  }
  .sidebar-label {
    margin-bottom: 6px;
  }
}
</style>
