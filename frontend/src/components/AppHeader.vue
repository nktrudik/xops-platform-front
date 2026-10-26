<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { logout, session } from '../services/api'
import AppIcon from './AppIcon.vue'
import mwsLogo from '../assets/brand/mws-logo.svg'

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
      <RouterLink class="brand" to="/" aria-label="MWS XOps Platform — главная">
        <img
          class="brand-logo"
          :src="mwsLogo"
          alt="MWS — МТС Web Services"
          width="44"
          height="44"
        />
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
  position: relative;
  background: #e4e4e8;
  border-bottom: 1px solid var(--border-strong);
  box-shadow: 0 3px 12px #20202708;
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
.brand-logo {
  display: block;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}
.brand-wordmark {
  font: 700 18px/1.1 var(--font-heading);
  letter-spacing: -0.4px;
}
.brand-wordmark > span {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  letter-spacing: 1.15px;
}
.header-caption {
  padding-left: 24px;
  border-left: 1px solid var(--border-strong);
  color: var(--text-secondary);
  font-size: 12px;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
  margin-left: auto;
}
.header-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--border-control);
  border-radius: var(--radius-sm);
  color: var(--text);
  background: var(--white);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--motion-fast),
    border-color var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
}
.header-link:hover {
  background: #f7f7f9;
  border-color: var(--graphite);
}
.header-link.is-current {
  background: var(--white);
  border-color: var(--border-control);
  color: var(--text);
  box-shadow: var(--shadow-control);
}
.header-link.is-current::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 16px;
  right: 16px;
  height: 3px;
  background: var(--primary);
}
.header-link.is-current:hover {
  background: #f7f7f9;
}
.header-link:active,
.sign-out:active {
  transform: scale(0.97);
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
  padding-left: 20px;
  border-left: 1px solid var(--border-strong);
}
.account-avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: var(--surface-elevated);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}
.account-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
}
.sign-out {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--border-control);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  transition:
    color var(--motion-fast),
    background var(--motion-fast),
    transform var(--motion-fast);
}
.sign-out:hover:not(:disabled) {
  color: var(--red-hover);
  border-color: var(--red-hover);
  background: var(--red-soft);
}
.header-error {
  margin-block: 0;
  padding-bottom: 12px;
  color: var(--red-hover);
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
  .brand-logo {
    width: 36px;
    height: 36px;
  }
  .brand-wordmark {
    font-size: 14px;
  }
  .brand-wordmark > span {
    font-size: 8px;
    letter-spacing: 0.9px;
  }
  .header-nav {
    gap: 8px;
  }
  .header-link {
    padding: 8px;
    font-size: 12px;
  }
  .header-link svg,
  .sign-out > span {
    display: none;
  }
  .account {
    padding: 0;
    border: 0;
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
    padding: 8px;
  }
}
</style>
