<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { logout, session } from '../services/api'
import { usePlatform } from '../app/context'
import AppBrand from './AppBrand.vue'
import AppIcon from './AppIcon.vue'
import PlatformGuide from './PlatformGuide.vue'
defineEmits<{ openNavigation: [] }>()
const route = useRoute()
const { copilots } = usePlatform()
const error = shallowRef('')
const pending = shallowRef(false)
const guideOpen = shallowRef(false)
const accountOpen = shallowRef(false)
const accountButton = useTemplateRef<HTMLButtonElement>('accountButton')
function closeAccount(): void {
  accountOpen.value = false
  accountButton.value?.focus()
}
const pageName = computed(() =>
  route.name === 'home'
    ? 'Главная'
    : route.name === 'catalog'
      ? 'Каталог Copilot'
      : route.name === 'copilot'
        ? (copilots.value.find((item) => item.id === route.params.id)?.name ?? 'Copilot')
        : 'XOps Platform',
)
const initials = computed(() => session.value?.username.slice(0, 2).toLocaleUpperCase('ru'))
async function signOut(): Promise<void> {
  if (pending.value) return
  error.value = ''
  pending.value = true
  try {
    await logout()
    accountOpen.value = false
  } catch {
    error.value = 'Не удалось выйти. Повторите попытку.'
  } finally {
    pending.value = false
  }
}
function leaveAccount(event: FocusEvent): void {
  if (
    event.currentTarget instanceof HTMLElement &&
    !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
  )
    accountOpen.value = false
}
</script>
<template>
  <header class="app-header" :class="{ 'guest-header': !session }">
    <template v-if="session">
      <button
        class="icon-button navigation-toggle"
        aria-label="Открыть меню"
        @click="$emit('openNavigation')"
      >
        <AppIcon name="menu" />
      </button>
      <div class="header-breadcrumb">
        <span>Рабочее пространство</span><AppIcon name="chevron" /><b>{{ pageName }}</b>
      </div>
      <RouterLink class="mobile-product" to="/" aria-label="XOps Platform — главная" translate="no"
        >XOps<span>Platform</span></RouterLink
      >
      <div class="header-actions">
        <button class="header-help" aria-label="О платформе" @click="guideOpen = true">
          <AppIcon name="info" /><span>О платформе</span>
        </button>
        <div
          class="account-control"
          @keydown.esc.prevent.stop="closeAccount"
          @focusout="leaveAccount"
        >
          <button
            ref="accountButton"
            class="account-trigger"
            :aria-expanded="accountOpen"
            aria-controls="account-popover"
            :aria-label="`Аккаунт: ${session.username}`"
            @click="accountOpen = !accountOpen"
          >
            <span class="account-avatar">{{ initials }}</span
            ><span class="account-text"
              ><b>{{ session.username }}</b
              ><small>Администратор</small></span
            ><AppIcon name="chevron" />
          </button>
          <div v-if="accountOpen" id="account-popover" class="account-popover">
            <span>{{ session.username }}</span
            ><button :disabled="pending" @click="signOut">
              <AppIcon name="logout" />{{ pending ? 'Выходим…' : 'Выйти' }}
            </button>
            <p v-if="error" role="alert">{{ error }}</p>
          </div>
        </div>
      </div>
      <PlatformGuide v-model="guideOpen" />
    </template>
    <template v-else
      ><AppBrand /><span class="guest-description">Единая AI-платформа МТС</span></template
    >
  </header>
</template>
<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 76px;
  padding: 12px 36px;
  border-bottom: 1px solid var(--border);
  background: rgb(255 255 255 / 96%);
}
.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  min-width: 0;
}
.header-breadcrumb > span {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.header-breadcrumb > svg {
  width: 12px;
  height: 12px;
  color: var(--muted);
  flex-shrink: 0;
}
.header-breadcrumb b {
  font-weight: 500;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-shrink: 0;
}
.header-help {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  background: none;
  border: 0;
  padding: 10px 0;
  font-size: 12px;
}
.header-help svg {
  width: 17px;
  height: 17px;
}
.header-help:hover {
  color: var(--red);
}
.account-control {
  position: relative;
}
.account-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-left: 1px solid var(--border);
  padding: 0 0 0 24px;
  background: none;
  color: var(--text);
  text-align: left;
}
.account-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  background: #eef0f3;
  color: #515762;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 500;
  transition: background 160ms;
}
.account-trigger:hover .account-avatar {
  background: #e4e7ed;
}
.account-text {
  display: grid;
  gap: 5px;
}
.account-text b {
  font-size: 12px;
  font-weight: 500;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.account-text small {
  font-size: 9px;
  color: var(--text-secondary);
}
.account-trigger > svg {
  width: 12px;
  height: 12px;
  margin-left: 8px;
  transform: rotate(90deg);
  color: var(--muted);
}
.account-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 14px);
  z-index: 45;
  min-width: 220px;
  max-width: calc(100vw - 32px);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgb(20 25 35 / 10%);
  padding: 10px;
  background: white;
}
.account-popover > span {
  display: block;
  padding: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.account-popover button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 12px 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  font-size: 13px;
}
.account-popover button:hover {
  background: var(--red-soft);
  color: var(--red);
}
.account-popover svg {
  width: 18px;
  height: 18px;
}
.account-popover p {
  font-size: 12px;
  color: var(--red);
  line-height: 1.6;
  padding: 0 8px;
}
.guest-header {
  justify-content: space-between;
  min-height: 88px;
  padding-inline: max(24px, calc((100vw - 1280px) / 2));
}
.guest-description {
  color: var(--text-secondary);
  font-size: 12px;
}
.navigation-toggle,
.mobile-product {
  display: none;
}
@media (max-width: 1100px) {
  .app-header {
    padding-inline: 28px;
  }
  .header-breadcrumb > span {
    display: none;
  }
  .header-breadcrumb > svg {
    display: none;
  }
  .account-text {
    display: none;
  }
  .account-trigger {
    padding-left: 18px;
  }
  .header-actions {
    gap: 18px;
  }
}
@media (max-width: 800px) {
  .app-header {
    padding: 12px 20px;
    min-height: 68px;
    gap: 12px;
  }
  .navigation-toggle {
    display: flex;
    width: 36px;
    height: 36px;
    padding: 7px;
  }
  .header-breadcrumb {
    display: none;
  }
  .mobile-product {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font: 500 17px var(--font-heading);
    letter-spacing: -0.5px;
  }
  .mobile-product > span {
    font: 400 10px var(--font-body);
    color: var(--text-secondary);
    letter-spacing: 0;
  }
  .header-help {
    padding: 9px;
  }
  .header-help > span {
    display: none;
  }
  .header-actions {
    gap: 8px;
  }
  .account-trigger {
    border-left: 0;
    padding-left: 0;
  }
  .account-trigger > svg {
    display: none;
  }
  .guest-header {
    padding: 20px 24px;
  }
  .guest-description {
    display: none;
  }
}
</style>
