<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../services/api'

const route = useRoute()
const router = useRouter()
const username = ref('admin')
const password = ref('')
const pending = ref(false)
const error = ref('')

async function submit(): Promise<void> {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    await login(username.value, password.value)
    password.value = ''
    const target = route.query.next
    await router.replace(
      typeof target === 'string' &&
        target.startsWith('/') &&
        !target.startsWith('//') &&
        !target.startsWith('/login')
        ? target
        : '/',
    )
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Не удалось войти.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="login-panel surface" aria-labelledby="login-title">
    <span class="section-eyebrow">XOps Platform</span>
    <h1 id="login-title">Вход в платформу</h1>
    <p>Ваши помощники и сохранённые диалоги — в одном месте.</p>
    <form @submit.prevent="submit">
      <label for="login-username">Логин</label>
      <input
        id="login-username"
        v-model="username"
        autocomplete="username"
        required
        maxlength="64"
        :disabled="pending"
      />
      <label for="login-password">Пароль</label>
      <input
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        maxlength="1024"
        :disabled="pending"
      />
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <button class="button button-primary" :disabled="pending || !password" type="submit">
        {{ pending ? 'Входим…' : 'Войти' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.login-panel {
  max-width: 480px;
  margin: 70px auto;
  padding: 40px;
}
h1 {
  font-size: 28px;
  margin: 14px 0;
}
p {
  color: var(--text-secondary);
  line-height: 1.6;
}
form {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}
label {
  font-size: 14px;
}
input {
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--background);
}
.login-error {
  color: var(--red);
  margin: 0;
}
button {
  margin-top: 12px;
}
@media (max-width: 640px) {
  .login-panel {
    margin: 32px auto;
    padding: 26px;
  }
}
</style>
