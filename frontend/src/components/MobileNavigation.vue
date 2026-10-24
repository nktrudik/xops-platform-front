<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppIcon from './AppIcon.vue'
const open = defineModel<boolean>({ required: true })
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
watch(open, async (value) => {
  await nextTick()
  if (value) dialog.value?.showModal()
  else dialog.value?.close()
})
</script>
<template>
  <dialog
    ref="dialog"
    class="mobile-navigation"
    aria-label="Меню платформы"
    @close="open = false"
    @cancel.prevent="open = false"
    @click="
      (event) => {
        if (event.target === event.currentTarget) open = false
      }
    "
  >
    <AppSidebar @navigate="open = false"
      ><button class="icon-button drawer-close" aria-label="Закрыть меню" @click="open = false">
        <AppIcon name="close" /></button
    ></AppSidebar>
  </dialog>
</template>
<style scoped>
.mobile-navigation {
  inset: 0 auto 0 0;
  margin: 0;
  width: min(288px, calc(100vw - 40px));
  max-width: none;
  max-height: none;
  height: 100dvh;
  padding: 0;
  border: 0;
  background: var(--sidebar);
  color: white;
  overscroll-behavior: contain;
}
.mobile-navigation[open] {
  animation: navigation-enter 200ms ease-out;
}
.mobile-navigation::backdrop {
  background: rgb(17 20 26 / 55%);
  backdrop-filter: blur(2px);
}
.drawer-close {
  width: 28px;
  height: 32px;
  padding: 4px;
  color: white;
}
.drawer-close:hover {
  background: #41444c;
}
@keyframes navigation-enter {
  from {
    transform: translateX(-24px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
