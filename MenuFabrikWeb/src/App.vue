<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
import { useAuthStore } from './stores/authStore'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'
import ReloadPrompt from './components/layout/ReloadPrompt.vue'

const authStore = useAuthStore()
authStore.setupAuthListener()
</script>

<template>
  <template v-if="authStore.isInitializedInApp">
    
    <!-- Écran de chargement pleine page (Période de Seeding) -->
    <div v-if="authStore.user && !authStore.isUserDbInitialized" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 backdrop-blur-md">
      <ProgressSpinner strokeWidth="4" class="mb-8 w-20 h-20 text-primary-500" />
      <h2 class="text-3xl font-extrabold text-surface-900 dark:text-surface-0 mb-4 animate-pulse">Création de votre espace gastronomique...</h2>
      <p class="text-surface-600 dark:text-surface-400 text-lg max-w-lg text-center leading-relaxed px-4">
        Nous cuisinons vos données... Réplication de nos meilleures recettes, menus et paramètres personnalisés en cours. 
        <br/><br/>
        Cela ne prendra que quelques instants. 🍳
      </p>
    </div>

    <!-- Application -->
    <AppLayout v-else />

  </template>
  
  <!-- Chargement initial Firebase -->
  <div v-else class="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
      <ProgressSpinner strokeWidth="4" />
  </div>

  <!-- Global Toast Component -->
  <Toast />

  <!-- PWA Update Prompt -->
  <ReloadPrompt />
</template>

<style scoped>
</style>
