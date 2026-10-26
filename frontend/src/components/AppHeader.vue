<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { logout, session } from '../services/api'
import AppIcon from './AppIcon.vue'

const error = shallowRef('')
const signingOut = shallowRef(false)
const initial = computed(() => session.value?.username.slice(0, 1).toLocaleUpperCase('ru'))

async function signOut(): Promise<void> {
  error.value = ''
  signingOut.value = true
  try {
    await logout()
  } catch {
    error.value = 'Не удалось выйти. Повторите попытку.'
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner page-container">
      <RouterLink class="brand" to="/" aria-label="МТС XOps Platform — главная">
        <span class="brand-mark" aria-hidden="true"
          ><span>М</span><span>Т</span><span>С</span></span
        >
        {{ ' ' }}
        <span class="brand-wordmark" translate="no">XOPS&nbsp;<span>PLATFORM</span></span>
      </RouterLink>
      <span class="header-caption">Рабочее пространство AI</span>
      <nav v-if="session" class="header-nav" aria-label="Основная навигация">
        <RouterLink class="header-link" to="/" exact-active-class="is-current">
          <AppIcon name="grid" /><span>Каталог Copilot</span>
        </RouterLink>
        <div class="account">
          <span class="account-avatar" aria-hidden="true">{{ initial }}</span>
          <span class="account-name" :title="session.username">{{ session.username }}</span>
        </div>
        <button
          class="sign-out"
          aria-label="Выйти"
          :disabled="signingOut"
          :aria-busy="signingOut"
          @click="signOut"
        >
          <span>Выйти</span><AppIcon name="logout" />
        </button>
      </nav>
    </div>
    <p v-if="error" class="header-error page-container" role="alert">{{ error }}</p>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  display: flex;
  align-items: center;
  min-height: 80px;
  gap: 24px;
}
.brand {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
  border-radius: 4px;
}
.brand-mark {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 40px;
  height: 40px;
  padding: 4px 5px;
  color: white;
  background: var(--red);
  font:
    700 17px/1 Arial,
    sans-serif;
}
.brand-mark span:last-child {
  grid-column: 2;
  align-self: end;
}
.brand-wordmark {
  font: 700 17px/1.1 var(--font-heading);
  letter-spacing: -0.3px;
}
.brand-wordmark > span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  letter-spacing: 0.2px;
}
.header-caption {
  padding-left: 24px;
  border-left: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  margin-left: auto;
}
.header-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 40px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--motion-fast),
    color var(--motion-fast);
}
.header-link.is-current {
  background: var(--red-soft);
  color: var(--red-hover);
}
.header-link:hover {
  color: var(--red);
  background: var(--surface-soft);
}
.header-link svg,
.sign-out svg {
  width: 17px;
  height: 17px;
}
.account {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.account-avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface-soft);
  font-size: 12px;
  font-weight: 500;
}
.account-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
  font-size: 13px;
}
.sign-out {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  transition:
    color var(--motion-fast),
    background var(--motion-fast);
}
.sign-out:hover {
  color: var(--red-hover);
  background: var(--red-soft);
}
.header-error {
  margin-block: 0;
  padding-bottom: 12px;
  color: var(--red);
  font-size: 13px;
}
@media (max-width: 1100px) {
  .header-caption {
    display: none;
  }
}
@media (max-width: 640px) {
  .header-inner {
    min-height: 72px;
    gap: 12px;
    flex-wrap: wrap;
    padding-block: 12px;
  }
  .brand {
    gap: 8px;
    min-height: 44px;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
    font-size: 15px;
  }
  .brand-wordmark {
    font-size: 14px;
  }
  .brand-wordmark > span {
    font-size: 9px;
  }
  .header-nav {
    gap: 8px;
  }
  .header-link {
    min-height: 44px;
    padding: 8px;
    font-size: 12px;
    gap: 6px;
  }
  .header-link svg,
  .sign-out > span {
    display: none;
  }
  .account-avatar {
    width: 28px;
    height: 28px;
  }
  .account-name {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .sign-out {
    min-width: 44px;
  }
}
</style>
