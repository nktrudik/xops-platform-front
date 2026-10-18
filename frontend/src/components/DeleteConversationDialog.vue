<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ title: string; pending: boolean; error: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())

function cancel(): void {
  if (!props.pending) emit('cancel')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="delete-dialog"
    aria-labelledby="delete-title"
    aria-describedby="delete-description"
    :aria-busy="pending"
    @cancel.prevent="cancel"
  >
    <span class="icon-tile"><AppIcon name="trash" /></span>
    <h2 id="delete-title">Удалить диалог?</h2>
    <p id="delete-description">
      Диалог «{{ title }}» и все его сообщения будут удалены. Восстановить их не получится.
    </p>
    <p v-if="error" class="delete-error" role="alert">{{ error }}</p>
    <div class="delete-actions">
      <button class="button delete-cancel" autofocus :disabled="pending" @click="cancel">
        Отмена
      </button>
      <button class="button button-primary" :disabled="pending" @click="emit('confirm')">
        {{ pending ? 'Удаляем…' : 'Удалить диалог' }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.delete-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 32px;
  border: 0;
  border-radius: 24px;
  background: var(--white);
  color: var(--text);
  box-shadow: 0 24px 80px rgb(0 0 0 / 18%);
}
.delete-dialog::backdrop {
  background: rgb(0 0 0 / 38%);
}
h2 {
  font-size: 24px;
  margin: 22px 0 14px;
}
p {
  line-height: 1.6;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
  flex-wrap: wrap;
}
.delete-cancel {
  background: var(--background);
  color: var(--text);
}
.delete-error {
  color: var(--red);
}
</style>
