<script setup lang="ts">
import { RouterLink } from 'vue-router'
import StatePanel from '../components/StatePanel.vue'
</script>

<template>
  <div class="not-found">
    <StatePanel
      title="Страница не найдена"
      description="Проверьте ссылку или откройте каталог Copilot."
      ><RouterLink class="button button-primary" to="/">Открыть каталог</RouterLink></StatePanel
    >
  </div>
</template>

<style scoped>
.not-found {
  margin-top: 48px;
}
</style>
