<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ref } from 'vue'
import { logout, session } from '../services/api'
const error = ref('')
async function signOut(): Promise<void> {
  error.value = ''
  try {
    await logout()
  } catch {
    error.value = 'Не удалось выйти. Повторите попытку.'
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner page-container">
      <RouterLink class="brand" to="/" aria-label="XOps Platform — главная">
        <span class="brand-mark" aria-hidden="true"
          ><span>М</span><span>Т</span><span>С</span></span
        >
        <span class="brand-wordmark">XOPS<span>PLATFORM</span></span>
      </RouterLink>
      <nav aria-label="Основная навигация">
        <RouterLink v-if="session" class="header-link" to="/">Каталог Copilot</RouterLink>
        <span v-if="session" class="account-name">{{ session.username }}</span>
        <button v-if="session" class="text-button" @click="signOut">Выйти</button>
        <span v-if="error" role="alert">{{ error }}</span>
      </nav>
    </div>
  </header>
</template>

<style scoped>
nav {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.account-name {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
