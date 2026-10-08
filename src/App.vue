<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <a class="skip-link" href="#main">Перейти к содержимому</a>
  <AppHeader />
  <main id="main" class="page-container" tabindex="-1">
    <RouterView />
  </main>
  <footer class="app-footer page-container">
    <span>XOps Platform</span>
    <span>Демо-режим · Каталог, статусы, чат и доступ используют mock-данные</span>
  </footer>
</template>
