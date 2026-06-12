<script setup lang="ts">
withDefaults(defineProps<{
  active: boolean
  label?: string
  overlay?: boolean
}>(), {
  label: '加载中',
  overlay: true
})
</script>

<template>
  <Transition name="loading-fade">
    <div
      v-if="active"
      class="loading-overlay"
      :class="{ 'is-overlay': overlay }"
      role="status"
      aria-live="polite"
      :aria-label="label"
    >
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>{{ label }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.loading-overlay {
  z-index: 10;
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: inherit;
  background: #ffffff;
  color: #6b7280;
  font-size: 14px;
}

.loading-overlay.is-overlay {
  position: absolute;
  inset: 0;
  min-height: 0;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(1px);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-top-color: #111827;
  border-radius: 50%;
  animation: loading-spin 0.72s linear infinite;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.16s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation-duration: 1.4s;
  }

  .loading-fade-enter-active,
  .loading-fade-leave-active {
    transition: none;
  }
}
</style>
