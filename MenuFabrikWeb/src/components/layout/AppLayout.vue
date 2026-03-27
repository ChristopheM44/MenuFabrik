<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppConfirmModal from './AppConfirmModal.vue'

const route = useRoute()

const navItems = [
  { name: 'Agenda', path: '/meals', icon: 'calendar_month' },
  { name: 'Courses', path: '/shopping-list', icon: 'shopping_basket' },
  { name: 'Recettes', path: '/recipes', icon: 'auto_stories' },
  { name: 'Paramètres', path: '/settings', icon: 'settings' }
]

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">

    <!-- Top Header Bar -->
    <header class="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl shadow-sm shadow-black/5 flex items-center justify-between px-6 h-16">

      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span class="material-symbols-outlined" style="font-size: 1.25rem">restaurant_menu</span>
        </div>
        <span class="font-headline font-bold tracking-tight text-xl text-primary">MenuFabrik</span>
      </div>

      <!-- Desktop Nav Links -->
      <nav class="hidden md:flex items-center gap-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-2 px-4 py-2 rounded-full font-label text-[10px] font-bold tracking-widest uppercase transition-all"
          :class="isActive(item.path)
            ? 'text-primary bg-primary-container/50'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'"
        >
          <span
            class="material-symbols-outlined"
            style="font-size: 1rem"
            :style="isActive(item.path) ? 'font-variation-settings: \'FILL\' 1' : ''"
          >{{ item.icon }}</span>
          {{ item.name }}
        </router-link>
      </nav>

      <!-- Spacer (balance logo) -->
      <div class="w-[140px]"></div>

    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-x-hidden pt-16 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
      <div class="max-w-5xl mx-auto w-full px-4 pt-4 md:pt-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav
      class="md:hidden fixed bottom-0 w-full z-50 rounded-t-3xl bg-surface-container-lowest/90 backdrop-blur-lg shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex justify-around items-center px-4 pt-3"
      style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
    >
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center gap-0.5 min-w-[3.5rem] transition-all"
        :class="isActive(item.path) ? 'text-primary' : 'text-on-surface-variant'"
      >
        <!-- Pill indicator -->
        <div
          class="w-14 h-8 rounded-full flex items-center justify-center transition-all"
          :class="isActive(item.path) ? 'bg-primary-container' : ''"
        >
          <span
            class="material-symbols-outlined text-2xl transition-all"
            :style="isActive(item.path) ? 'font-variation-settings: \'FILL\' 1' : ''"
          >{{ item.icon }}</span>
        </div>
        <span class="font-label text-[10px] font-bold tracking-widest uppercase">{{ item.name }}</span>
      </router-link>
    </nav>

    <AppConfirmModal />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
