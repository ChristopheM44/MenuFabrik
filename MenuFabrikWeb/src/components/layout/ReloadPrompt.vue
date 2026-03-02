<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import Button from 'primevue/button'

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

const close = async () => {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="fixed bottom-4 right-4 z-[10000] p-4 bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl flex flex-col gap-3 min-w-[300px] max-w-sm animate-fadein"
    role="alert"
  >
    <div class="flex items-start gap-3">
      <div 
        class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        :class="needRefresh ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'"
      >
        <i :class="needRefresh ? 'pi pi-cloud-download text-xl' : 'pi pi-check text-xl'"></i>
      </div>
      <div>
        <h3 class="font-bold text-surface-900 dark:text-surface-0 m-0">
          {{ needRefresh ? 'Mise à jour disponible' : 'Prêt hors-ligne' }}
        </h3>
        <p class="text-surface-600 dark:text-surface-400 text-sm mt-1 mb-0">
          {{ needRefresh 
            ? 'Une nouvelle version de MenuFabrik est disponible. Rechargez pour mettre à jour.' 
            : 'L\'application est maintenant prête à fonctionner sans connexion internet.' 
          }}
        </p>
      </div>
    </div>
    
    <div class="flex justify-end gap-2 mt-1">
      <Button 
        v-if="needRefresh" 
        label="Mettre à jour" 
        icon="pi pi-refresh" 
        size="small" 
        @click="updateServiceWorker()" 
      />
      <Button 
        label="Fermer" 
        severity="secondary" 
        variant="text" 
        size="small" 
        @click="close" 
      />
    </div>
  </div>
</template>

<style scoped>
.animate-fadein {
  animation: fadein 0.3s ease-out forwards;
}

@keyframes fadein {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
