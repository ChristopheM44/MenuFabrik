<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
authStore.setupAuthListener()
</script>

<template>
  <AppLayout />
</template>

<style scoped>
</style>
