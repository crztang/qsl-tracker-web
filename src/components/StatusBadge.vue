<script setup lang="ts">
import type { CardStatus, CardType } from '@/api/types'

const props = defineProps<{
  value: CardStatus | CardType | string
  label?: string
}>()

const labels: Record<string, string> = {
  '1': '待发出',
  '2': '已发出',
  '3': '已收到',
  '4': '已确认'
}
</script>

<template>
  <span class="badge" :data-tone="props.value">{{ props.label || labels[props.value] || props.value }}</span>
</template>
