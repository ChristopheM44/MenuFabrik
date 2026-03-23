<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
import { useAuthStore } from './stores/authStore'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'
import ReloadPrompt from './components/layout/ReloadPrompt.vue'

import { useRecipeStore } from './stores/recipeStore'
import { useMealStore } from './stores/mealStore'
import { useShoppingStore } from './stores/shoppingStore'
import { usePantryStore } from './stores/pantryStore'
import { useParticipantStore } from './stores/participantStore'
import { useAllergenStore } from './stores/allergenStore'
import { useSideDishStore } from './stores/sideDishStore'

const authStore = useAuthStore()
authStore.setupAuthListener()

// Initialisation précoce des stores pour démarrer les listeners temps réel (Évite le double fetch, Audit 4.2)
useRecipeStore()
useMealStore()
useShoppingStore()
usePantryStore()
useParticipantStore()
useAllergenStore()
useSideDishStore()
</script>

<template>
  <template v-if="authStore.isInitializedInApp">
    
    <!-- Écran de chargement pleine page (Période de Seeding) -->
    <div v-if="authStore.user && !authStore.isUserDbInitialized" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background backdrop-blur-md">
      <ProgressSpinner strokeWidth="4" class="mb-8 w-20 h-20 text-primary" />
      <h2 class="text-3xl font-extrabold text-on-surface mb-4 animate-pulse">Création de votre espace gastronomique...</h2>
      <p class="text-on-surface-variant text-lg max-w-lg text-center leading-relaxed px-4">
        Nous cuisinons vos données... Réplication de nos meilleures recettes, menus et paramètres personnalisés en cours. 
        <br/><br/>
        Cela ne prendra que quelques instants. 🍳
      </p>
    </div>

    <!-- Application -->
    <AppLayout v-else />

  </template>
  
  <!-- Chargement initial Firebase -->
  <div v-else class="min-h-screen bg-background flex items-center justify-center">
      <ProgressSpinner strokeWidth="4" />
  </div>

  <!-- Global Toast Component -->
  <Toast />

  <!-- PWA Update Prompt -->
  <ReloadPrompt />
</template>

<style scoped>
</style>
