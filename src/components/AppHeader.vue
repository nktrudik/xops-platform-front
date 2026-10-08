<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
        <RouterLink class="header-link" to="/">Каталог Copilot</RouterLink>
      </nav>
      <div class="demo-access">
        <span class="demo-label">Демо-доступ</span
        ><span class="avatar" aria-label="Демонстрационный пользователь">X</span>
      </div>
    </div>
  </header>
</template>
