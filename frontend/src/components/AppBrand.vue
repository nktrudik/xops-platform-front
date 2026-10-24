<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{ compact?: boolean }>()
</script>
<template>
  <RouterLink class="app-brand" to="/" aria-label="XOps Platform — главная">
    <span class="app-brand-mark" aria-hidden="true"
      ><span>М</span><span>Т</span><span>С</span></span
    >
    <span v-if="!compact" class="app-brand-name" translate="no">XOps<span>Platform</span></span>
  </RouterLink>
</template>
<style scoped>
.app-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.app-brand-mark {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 38px;
  height: 38px;
  padding: 4px 5px;
  background: var(--red);
  color: white;
  font:
    700 15px/1 Arial,
    sans-serif;
}
.app-brand-mark > span:last-child {
  grid-column: 2;
  align-self: end;
}
.app-brand-name {
  font: 700 18px/1 var(--font-heading);
  letter-spacing: -0.5px;
}
.app-brand-name > span {
  display: block;
  margin-top: 6px;
  font: 400 10px/1 var(--font-body);
  text-transform: uppercase;
  letter-spacing: 2.1px;
}
</style>
