<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { interfaceLabels, statusLabels, type Copilot } from '../domain/copilot'
import AppIcon from './AppIcon.vue'
import StatusBadge from './StatusBadge.vue'
defineProps<{ copilot: Copilot }>()
</script>

<template>
  <article
    class="copilot-card surface"
    :class="{ 'card-unavailable': copilot.status !== 'available' }"
  >
    <div class="card-heading">
      <span class="icon-tile"><AppIcon :name="copilot.icon" /></span>
      <StatusBadge :status="copilot.status" />
    </div>
    <h3>{{ copilot.name }}</h3>
    <p>{{ copilot.description }}</p>
    <div class="card-bottom">
      <span class="interface-label"
        ><AppIcon :name="copilot.interfaceType === 'chat' ? 'chat' : 'layers'" />{{
          copilot.interfaceType ? interfaceLabels[copilot.interfaceType] : 'Интерфейс не настроен'
        }}</span
      >
      <RouterLink
        v-if="copilot.status === 'available' || copilot.status === 'configuration-error'"
        class="card-open"
        :to="{ name: 'copilot', params: { id: copilot.id } }"
        :aria-label="`Открыть ${copilot.name}`"
        >Открыть<AppIcon name="arrow"
      /></RouterLink>
      <span v-else class="unavailable-label">{{
        copilot.status === 'coming-soon' ? 'Скоро на платформе' : statusLabels[copilot.status]
      }}</span>
    </div>
  </article>
</template>
