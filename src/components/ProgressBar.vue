<script setup>
defineProps({
  progress: {
    type: Number,
    required: true
  }
})
</script>
<template>
  <div class="w-full flex justify-start mb-1">
    <span class="text-base font-medium text-blue-700">Loading Model (Only Once)</span>
  </div>
  <div class="w-full bg-gray-200 rounded-full">
    <div class="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" :style="{ width: `${progress}%` }">
      {{ progress }}%
    </div>
  </div>
</template>
