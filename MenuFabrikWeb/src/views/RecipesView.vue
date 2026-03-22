<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import RecipeGrid from '../components/recipes/RecipeGrid.vue';
import type { Recipe } from '../models/Recipe';
import { RecipeShareService } from '../services/RecipeShareService';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const recipeStore = useRecipeStore();
const searchQuery = ref('');
const activeCategory = ref('Toutes');
const categories = ['Toutes', 'Viandes', 'Poissons', 'Végétarien', 'Rapide', 'Au Four'];
const toast = useToast();

onMounted(async () => {
    if (recipeStore.recipes.length === 0) {
        await recipeStore.fetchRecipes();
    }
});

const filteredRecipes = computed(() => {
    let result = recipeStore.recipes;
    if (activeCategory.value !== 'Toutes') {
        result = result.filter(r => r.category === activeCategory.value);
    }
    if (searchQuery.value) {
        const lowerQuery = searchQuery.value.toLowerCase();
        result = result.filter(r =>
            r.name.toLowerCase().includes(lowerQuery) ||
            r.category?.toLowerCase().includes(lowerQuery)
        );
    }
    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
});

const shareRecipe = async (recipe: Recipe) => {
    const result = await RecipeShareService.shareOrCopy(recipe);
    if (result.copied) {
        toast.add({ severity: 'success', summary: 'Lien copié', detail: 'Le lien de partage a été copié dans le presse-papier.', life: 3000 });
    }
};
</script>

<template>
    <div class="recipes-view w-full max-w-[1400px] mx-auto p-4 md:p-8 animate-fadein pb-24">
        <!-- Hero Section -->
        <section class="mb-8 mt-2 md:mt-6">
            <div class="flex flex-col items-start gap-4">
                <div>
                    <h1 class="font-extrabold tracking-tighter text-4xl md:text-5xl text-surface-900 dark:text-surface-0 mb-3">
                        Carnet de <br class="hidden md:block"/><span class="text-primary-600 dark:text-primary-400">Recettes.</span>
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 max-w-lg leading-relaxed font-medium">
                        {{ recipeStore.recipes.length }} recettes organisées dans votre atelier culinaire. Parcourez, filtrez et régalez-vous.
                    </p>
                </div>
            </div>
        </section>

        <!-- Recherche, Filtres et Actions -->
        <div class="flex flex-col gap-4 mb-8">
            <div class="flex flex-col md:flex-row gap-4 w-full items-start md:items-center justify-between">
                <div class="relative w-full md:max-w-xl flex-1">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 z-10"></i>
                    <InputText v-model="searchQuery" placeholder="Rechercher une recette, ingrédient..." class="w-full bg-surface-100 dark:bg-[#191a1f] border-none rounded-full py-3.5 pr-4 focus:ring-2 focus:ring-primary-500/20 focus:bg-surface-0 dark:focus:bg-[#202126] transition-all font-medium text-surface-900 dark:text-surface-0 placeholder-surface-500 dark:placeholder-surface-400 shadow-sm" style="padding-left: 2.75rem;" />
                </div>
                <Button icon="pi pi-plus" label="Nouvelle" severity="primary" class="shrink-0 rounded-full font-bold px-6 py-3 shadow-sm hover:shadow-md transition-all w-full md:w-auto" @click="$router.push('/recipes/new')" />
            </div>

            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    v-for="cat in categories"
                    :key="cat"
                    @click="activeCategory = cat"
                    class="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all whitespace-nowrap border"
                    :class="activeCategory === cat
                        ? 'bg-primary-600 dark:bg-primary-500 text-white border-primary-600 dark:border-primary-500 shadow-md'
                        : 'bg-surface-0 dark:bg-[#191a1f] border-surface-200 dark:border-[#2b2d31] hover:bg-surface-50 dark:hover:bg-[#202126] text-surface-600 dark:text-surface-300'"
                >
                    {{ cat }}
                </button>
            </div>
        </div>

        <!-- Grille partagée -->
        <RecipeGrid
            mode="catalog"
            :recipes="filteredRecipes"
            :loading="recipeStore.isLoading"
            @edit="(r) => router.push(`/recipes/${r.id}`)"
            @delete="(r) => recipeStore.deleteRecipe(r.id!)"
            @share="shareRecipe"
        />
    </div>
</template>

<style scoped>
.animate-fadein {
    animation: fadein 0.4s ease-out forwards;
}
@keyframes fadein {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
