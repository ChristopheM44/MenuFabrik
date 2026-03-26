<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import InputText from 'primevue/inputtext';
import RecipeGrid from '../components/recipes/RecipeGrid.vue';
import PageHeader from '../components/layout/PageHeader.vue';
import type { Recipe } from '../models/Recipe';
import { RecipeShareService } from '../services/RecipeShareService';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const recipeStore = useRecipeStore();
const searchQuery = ref('');
const activeCategory = ref('Toutes');
const categories = ['Toutes', 'Viandes', 'Poissons', 'Végétarien', 'Rapide', 'Au Four'];
const toast = useToast();

onMounted(() => {
    // Les recettes se chargent toutes seules en tâche de fond grâce à useFirebaseCollection.
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
        <PageHeader
            icon="pi pi-book"
            label="Recettes"
            title="Carnet de Recettes"
            :subtitle="`${recipeStore.recipes.length} recettes dans votre atelier culinaire`"
        />

        <!-- Recherche, Filtres et bouton + — sticky au scroll -->
        <div class="sticky top-0 z-10 bg-background -mx-4 md:-mx-8 px-4 md:px-8 pt-2 pb-4 flex flex-col gap-3">
            <div class="flex items-center gap-3">
                <div class="relative flex-1">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10"></i>
                    <InputText v-model="searchQuery" placeholder="Rechercher une recette, ingrédient..." class="w-full bg-surface-container-low border-none rounded-full py-3.5 pr-4 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-medium text-on-surface placeholder-on-surface-variant shadow-sm" style="padding-left: 2.75rem;" />
                </div>
                <button
                    class="w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0"
                    aria-label="Nouvelle recette"
                    @click="$router.push('/recipes/new')"
                >
                    <i class="pi pi-plus text-lg"></i>
                </button>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                    v-for="cat in categories"
                    :key="cat"
                    @click="activeCategory = cat"
                    class="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all whitespace-nowrap border"
                    :class="activeCategory === cat
                        ? 'bg-primary text-on-primary border-primary shadow-md'
                        : 'bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low text-on-surface-variant'"
                >
                    {{ cat }}
                </button>
            </div>
        </div>

        <!-- Grille partagée -->
        <RecipeGrid
            class="mt-6"
            mode="catalog"
            :recipes="filteredRecipes"
            :loading="recipeStore.isLoading"
            @edit="(r) => router.push(`/recipes/${r.id}`)"
            @delete="(r) => recipeStore.deleteRecipe(r.id!)"
            @share="shareRecipe"
            @cook="(r) => router.push({ name: 'cooking', params: { recipeId: r.id } })"
        />
    </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>

