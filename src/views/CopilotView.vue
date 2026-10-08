<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { usePlatform } from '../app/context'
import AppIcon from '../components/AppIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import StatePanel from '../components/StatePanel.vue'
import ChatPanel from '../components/ChatPanel.vue'
import EmbeddedApp from '../components/EmbeddedApp.vue'

const route = useRoute()
const { copilots, loading, error, loadCatalog } = usePlatform()
const copilot = computed(() => copilots.value.find((item) => item.id === route.params.id))
watch(
  copilot,
  (value) => {
    if (value) document.title = `${value.name} — XOps Platform`
  },
  { immediate: true },
)
</script>

<template>
  <nav class="breadcrumbs" aria-label="Хлебные крошки">
    <RouterLink to="/" aria-label="Каталог Copilot"
      ><AppIcon name="home" /><span>Каталог</span></RouterLink
    ><AppIcon name="chevron" /><span>{{ copilot?.name ?? 'Copilot' }}</span>
  </nav>
  <StatePanel v-if="loading" title="Загружаем Copilot" loading />
  <StatePanel v-else-if="error" title="Не удалось открыть Copilot" :description="error"
    ><button class="button button-primary" @click="loadCatalog">
      Повторить попытку
    </button></StatePanel
  >
  <template v-else-if="copilot">
    <div class="copilot-page-heading">
      <span class="icon-tile"><AppIcon :name="copilot.icon" /></span>
      <div>
        <div class="copilot-title-row">
          <h1>{{ copilot.name }}</h1>
          <StatusBadge :status="copilot.status" />
        </div>
        <p>{{ copilot.description }}</p>
      </div>
    </div>
    <StatePanel
      v-if="copilot.status !== 'available'"
      :title="
        copilot.status === 'maintenance' ? 'Copilot на обслуживании' : 'Copilot скоро появится'
      "
      description="Выберите другой инструмент в каталоге."
      ><RouterLink class="button button-secondary" to="/"
        >Вернуться в каталог</RouterLink
      ></StatePanel
    >
    <ChatPanel v-else-if="copilot.interfaceType === 'chat'" :key="copilot.id" :copilot="copilot" />
    <EmbeddedApp v-else :key="copilot.id" :copilot="copilot" />
  </template>
  <StatePanel
    v-else
    title="Copilot не найден"
    description="Возможно, приложение удалено из каталога или ссылка неверна."
    ><RouterLink class="button button-primary" to="/">Вернуться в каталог</RouterLink></StatePanel
  >
</template>

<style scoped>
.copilot-page-heading {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin: 30px 0;
}
.copilot-page-heading > .icon-tile {
  flex-shrink: 0;
  margin-top: 3px;
}
.copilot-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
}
h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.25;
  letter-spacing: -0.8px;
}
p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 12px 0 0;
  max-width: 960px;
}
@media (max-width: 640px) {
  .copilot-page-heading {
    gap: 12px;
  }
  .copilot-page-heading > .icon-tile {
    width: 42px;
    height: 42px;
  }
  .copilot-title-row {
    gap: 10px;
  }
}
</style>
