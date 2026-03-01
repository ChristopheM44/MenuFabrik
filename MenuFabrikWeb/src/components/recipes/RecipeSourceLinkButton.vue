<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    url: string
}>();

// Simple détection de la plateforme
const platform = computed(() => {
    try {
        const urlObj = new URL(props.url);
        const host = urlObj.hostname.toLowerCase();
        
        if (host.includes('cookidoo')) return { name: 'Ouvrir dans Cookidoo', class: 'bg-green-600 hover:bg-green-700', icon: 'pi pi-external-link' }; // Cookidoo green
        if (host.includes('cookomix')) return { name: 'Ouvrir dans Cookomix', class: 'bg-red-500 hover:bg-red-600', icon: 'pi pi-external-link' };
        if (host.includes('marmiton')) return { name: 'Ouvrir sur Marmiton', class: 'bg-orange-600 hover:bg-orange-700', icon: 'pi pi-external-link' };
        
        return { name: 'Voir la recette en ligne', class: 'bg-primary-600 hover:bg-primary-700', icon: 'pi pi-globe' };
    } catch {
        // En cas d'URL invalide
        return { name: 'Lien invalide', class: 'bg-surface-400', icon: 'pi pi-times' };
    }
});

const openLink = () => {
    if (props.url) {
        window.open(props.url, '_blank', 'noreferrer,noopener');
    }
};
</script>

<template>
    <button 
        @click="openLink"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-white font-medium transition-colors cursor-pointer border-none outline-none shadow-sm"
        :class="platform.class"
        :disabled="platform.name === 'Lien invalide'"
    >
        <i :class="platform.icon" class="text-xl"></i>
        <span class="text-[1.05rem]">{{ platform.name }}</span>
    </button>
</template>
