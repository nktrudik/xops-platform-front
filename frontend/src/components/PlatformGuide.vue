<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import AppIcon from './AppIcon.vue'
const open = defineModel<boolean>({ required: true })
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
watch(open, async (value) => {
  await nextTick()
  if (value) dialog.value?.showModal()
  else dialog.value?.close()
})
</script>
<template>
  <dialog
    ref="dialog"
    class="platform-guide"
    aria-labelledby="guide-title"
    @cancel.prevent="open = false"
    @close="open = false"
  >
    <div class="guide-heading">
      <span class="section-eyebrow">Знакомство с платформой</span
      ><button class="icon-button" aria-label="Закрыть справку" @click="open = false">
        <AppIcon name="close" />
      </button>
    </div>
    <h2 id="guide-title">Ваши помощники для рабочих задач</h2>
    <p>
      XOps объединяет AI-инструменты команд МТС. Найдите Copilot в каталоге и откройте его карточку.
    </p>
    <ul class="guide-formats">
      <li>
        <AppIcon name="chat" />
        <div>
          <b>Универсальный чат</b>
          <p>Общайтесь с Copilot в едином интерфейсе. Диалоги и история сообщений сохраняются.</p>
        </div>
      </li>
      <li>
        <AppIcon name="layers" />
        <div>
          <b>Встроенное приложение</b>
          <p>Работайте в собственном интерфейсе Copilot внутри платформы.</p>
        </div>
      </li>
      <li>
        <AppIcon name="external" />
        <div>
          <b>Внешний продукт</b>
          <p>Переходите к сервису в отдельной вкладке и возвращайтесь в каталог.</p>
        </div>
      </li>
    </ul>
    <button class="button button-primary" @click="open = false">
      Всё понятно<AppIcon name="check" />
    </button>
  </dialog>
</template>
<style scoped>
.platform-guide {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--text);
  background: white;
  overscroll-behavior: contain;
}
.platform-guide::backdrop {
  background: rgb(17 20 26 / 45%);
  backdrop-filter: blur(3px);
}
.guide-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.guide-heading .icon-button {
  width: 32px;
  height: 32px;
}
.platform-guide h2 {
  font-size: 24px;
  line-height: 1.4;
  letter-spacing: -0.7px;
  margin: 20px 0 16px;
}
.platform-guide p {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 14px;
}
.guide-formats {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 24px;
  margin: 28px 0;
}
.guide-formats li {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.guide-formats li > svg {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  flex-shrink: 0;
  color: var(--red);
}
.guide-formats b {
  font-size: 14px;
  font-weight: 500;
}
.guide-formats p {
  font-size: 13px;
  margin: 6px 0 0;
}
.platform-guide .button {
  width: 100%;
}
@media (max-width: 600px) {
  .platform-guide {
    padding: 24px;
  }
  .platform-guide h2 {
    font-size: 21px;
  }
}
</style>
