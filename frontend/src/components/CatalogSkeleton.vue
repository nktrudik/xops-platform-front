<template>
  <div class="catalog-skeleton" role="status" aria-label="Загружаем каталог" aria-busy="true">
    <div v-for="index in 6" :key="index" class="skeleton-card" aria-hidden="true">
      <span class="skeleton-icon" /><span class="skeleton-title" /><span
        class="skeleton-line"
      /><span class="skeleton-line short" /><span class="skeleton-footer" />
    </div>
    <span class="sr-only">Загружаем каталог</span>
  </div>
</template>
<style scoped>
.catalog-skeleton {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.skeleton-card {
  padding: 24px;
  border: 1px solid var(--border);
  background: white;
  border-radius: 12px;
  min-height: 244px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-card > span {
  background: #edf0f3;
  border-radius: 4px;
  animation: skeleton-pulse 1.8s ease-in-out infinite;
}
.skeleton-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
}
.skeleton-title {
  width: 75%;
  height: 16px;
}
.skeleton-line {
  width: 100%;
  height: 10px;
}
.skeleton-line.short {
  width: 60%;
}
.skeleton-footer {
  width: 40%;
  height: 12px;
  margin-top: auto;
}
@keyframes skeleton-pulse {
  50% {
    opacity: 0.45;
  }
}
@media (max-width: 1250px) {
  .catalog-skeleton {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .catalog-skeleton {
    grid-template-columns: 1fr;
  }
}
</style>
