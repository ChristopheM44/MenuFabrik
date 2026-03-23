<script setup lang="ts">
import { useRoute } from 'vue-router'
import ConfirmDialog from 'primevue/confirmdialog'
import { useTheme } from '../../composables/useTheme'
import { useAuthStore } from '../../stores/authStore'

const route = useRoute()
const { isDark, toggleTheme } = useTheme()
const authStore = useAuthStore()

const logout = async () => {
    await authStore.logout()
}

const navItems = [
  { name: 'Agenda', path: '/meals', icon: 'pi pi-calendar' },
  { name: 'Courses', path: '/shopping-list', icon: 'pi pi-shopping-cart' },
  { name: 'Recettes', path: '/recipes', icon: 'pi pi-book' },
  { name: 'Paramètres', path: '/settings', icon: 'pi pi-cog' }
]
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col md:flex-row pb-16 md:pb-0">
    
    <!-- Mobile Header -->
    <header class="md:hidden bg-surface-container-lowest border-b border-outline-variant p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
      <h1 class="text-xl font-bold text-primary">{{ route.meta.title || 'MenuFabrik' }}</h1>
      <div class="flex items-center gap-2">
        <button @click="toggleTheme" class="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant focus:outline-none" aria-label="Basculer le thème">
            <i :class="isDark ? 'pi pi-moon' : 'pi pi-sun'" class="text-xl"></i>
        </button>
        <button v-if="authStore.user" @click="logout" :title="`Connecté en tant que: ${authStore.user.email}`" class="p-2 rounded-full hover:bg-red-50 transition-colors text-on-surface-variant hover:text-red-600 focus:outline-none" aria-label="Se déconnecter">
            <i class="pi pi-sign-out text-xl"></i>
        </button>
      </div>
    </header>

    <!-- Desktop Sidebar Navigation -->
    <nav class="hidden md:flex flex-col w-64 bg-surface-container-lowest border-r border-outline-variant h-screen sticky top-0 z-20">
      <div class="p-6 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-primary flex items-center gap-2">
          <i class="pi pi-sparkles text-xl"></i> MenuFabrik
        </h1>
        <div class="flex items-center gap-1">
          <button @click="toggleTheme" class="p-2 rounded-full hover:bg-surface-container transition-colors focus:outline-none" aria-label="Basculer le thème">
              <i :class="isDark ? 'pi pi-moon text-primary-400' : 'pi pi-sun text-orange-500'" class="text-lg"></i>
          </button>
          <button v-if="authStore.user" @click="logout" :title="`Connecté en tant que: ${authStore.user.email}`" class="p-2 rounded-full hover:bg-red-50 transition-colors text-on-surface-variant hover:text-red-600 focus:outline-none" aria-label="Se déconnecter">
              <i class="pi pi-sign-out text-lg"></i>
          </button>
        </div>
      </div>
      
      <div class="flex-1 px-4 flex flex-col gap-2">
        <router-link 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-on-surface-variant hover:bg-surface-container"
          active-class="bg-primary-container text-on-primary-container"
        >
          <i :class="item.icon" class="text-lg"></i>
          {{ item.name }}
        </router-link>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-x-hidden flex flex-col relative w-full pt-4 md:pt-6">
      <div class="max-w-5xl mx-auto w-full px-4 flex-1">
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
    <nav class="md:hidden fixed bottom-0 w-full bg-surface-container-lowest border-t border-outline-variant z-50 flex justify-around items-center h-16 safe-area-bottom pb-env shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <router-link 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-full h-full text-on-surface-variant transition-colors"
        active-class="text-primary font-medium"
      >
        <i :class="[item.icon, route.path === item.path ? 'scale-110 bg-primary-container' : '']" class="text-xl mb-1 flex items-center justify-center p-1 rounded-full transition-transform"></i>
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
