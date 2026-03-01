<script setup lang="ts">
import { useRoute } from 'vue-router'
import ConfirmDialog from 'primevue/confirmdialog'

const route = useRoute()

const navItems = [
  { name: 'Agenda', path: '/meals', icon: 'pi pi-calendar' },
  { name: 'Recettes', path: '/recipes', icon: 'pi pi-book' },
  { name: 'Paramètres', path: '/settings', icon: 'pi pi-cog' }
]
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col md:flex-row pb-16 md:pb-0">
    
    <!-- Mobile Header -->
    <header class="md:hidden bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
      <h1 class="text-xl font-bold text-primary">{{ route.meta.title || 'MenuFabrik' }}</h1>
    </header>

    <!-- Desktop Sidebar Navigation -->
    <nav class="hidden md:flex flex-col w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 h-screen sticky top-0 z-20">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-primary flex items-center gap-2">
          <i class="pi pi-sparkles text-xl"></i> MenuFabrik
        </h1>
      </div>
      
      <div class="flex-1 px-4 flex flex-col gap-2">
        <router-link 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-surface-700 dark:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800"
          active-class="bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400"
        >
          <i :class="item.icon" class="text-lg"></i>
          {{ item.name }}
        </router-link>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)] md:min-h-screen">
      <div class="max-w-5xl mx-auto w-full relative">
        <router-view v-slot="{ Component }">
          <transition 
            name="fade" 
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 w-full bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 z-50 flex justify-around items-center h-16 safe-area-bottom pb-env shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <router-link 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-full h-full text-surface-500 dark:text-surface-400 transition-colors"
        active-class="text-primary-600 dark:text-primary-400 font-medium"
      >
        <i :class="[item.icon, route.path === item.path ? 'scale-110 bg-primary-50 dark:bg-primary-900/30' : '']" class="text-xl mb-1 flex items-center justify-center p-1 rounded-full transition-transform"></i>
        <span class="text-[10px]">{{ item.name }}</span>
      </router-link>
    </nav>
    
    <!-- Modale Globale de Confirmation -->
    <ConfirmDialog></ConfirmDialog>

  </div>
</template>

<style>
/* Animations de transition de route */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Prise en compte de la "safe area" sur iOS (le trait en bas de l'écran) */
.pb-env {
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-area-bottom {
  height: calc(4rem + env(safe-area-inset-bottom));
}
</style>
