<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'

defineProps<{
  message: string
}>()
</script>

<template>
  <Transition name="toast">
    <div v-if="message" class="success-toast" role="status">
      <span class="success-icon">
        <CheckCircle2 :size="18" />
      </span>
      <div>
        <strong>操作成功</strong>
        <span>{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.success-toast {
  position: fixed;
  top: 22px;
  right: 24px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 260px;
  max-width: min(380px, calc(100vw - 32px));
  padding: 13px 16px;
  border: 1px solid #bbf7d0;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(17, 24, 39, 0.14);
}

.success-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #dcfce7;
  color: #15803d;
}

.success-toast strong,
.success-toast span {
  display: block;
}

.success-toast strong {
  color: #166534;
  font-size: 14px;
}

.success-toast div > span {
  margin-top: 2px;
  color: #4b5563;
  font-size: 13px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
