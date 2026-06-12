<script setup lang="ts">
import { CircleAlert, X } from 'lucide-vue-next'
import { useNotification } from '@/stores/notification'

const { errorMessage, clearError } = useNotification()
</script>

<template>
  <Transition name="error-toast">
    <div v-if="errorMessage" class="error-toast" role="alert" aria-live="assertive">
      <span class="error-icon">
        <CircleAlert :size="19" />
      </span>
      <div class="error-content">
        <strong>操作失败</strong>
        <span>{{ errorMessage }}</span>
      </div>
      <button type="button" aria-label="关闭提示" @click="clearError">
        <X :size="17" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.error-toast {
  position: fixed;
  top: 22px;
  right: 24px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 280px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 13px 14px;
  border: 1px solid #fecaca;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(17, 24, 39, 0.16);
}

.error-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
}

.error-content {
  min-width: 0;
  flex: 1;
}

.error-content strong,
.error-content span {
  display: block;
}

.error-content strong {
  color: #991b1b;
  font-size: 14px;
}

.error-content span {
  margin-top: 2px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.error-toast button {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
}

.error-toast button:hover {
  background: #f3f4f6;
}

.error-toast-enter-active,
.error-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.error-toast-enter-from,
.error-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .error-toast {
    top: 12px;
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>
