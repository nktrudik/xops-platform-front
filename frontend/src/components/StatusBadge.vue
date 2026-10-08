<script setup lang="ts">
import { statusLabels, type CopilotStatus } from '../domain/copilot'
defineProps<{ status: CopilotStatus }>()
</script>

<template>
  <span class="status-badge" :class="`status-${status}`"
    ><span class="status-dot" />{{ statusLabels[status] }}</span
  >
</template>
