<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Recipe } from '../../models/Recipe';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import RecipeGrid from '../recipes/RecipeGrid.vue';

const props = defineProps<{
    visible: boolean;
    recipes: Recipe[];
    selectedRecipeId?: string;
    header?: string;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'recipe-selected', recipe: Recipe): void;
}>();

const recipeSearchQuery = ref('');
const activeCategory = ref('Toutes');
const categories = ['Toutes', 'Viandes', 'Poissons', 'Végétarien', 'Rapide', 'Au Four'];

const filteredRecipes = computed((): Recipe[] => {
    let list = [...props.recipes];
    if (activeCategory.value !== 'Toutes') {
        list = list.filter(r => r.category === activeCategory.value);
    }
    if (recipeSearchQuery.value) {
        const query = recipeSearchQuery.value.toLowerCase();
        list = list.filter(r =>
            r.name.toLowerCase().includes(query) ||
            (r.category && r.category.toLowerCase().includes(query))
        );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const displayLimit = ref(20);
const visibleRecipes = computed(() => filteredRecipes.value.slice(0, displayLimit.value));

const observerTarget = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const selectRecipe = (recipe: Recipe) => {
    recipeSearchQuery.value = '';
    activeCategory.value = 'Toutes';
    emit('recipe-selected', recipe);
    emit('update:visible', false);
};

const close = () => {
    emit('update:visible', false);
};

const onDialogShow = () => {
    displayLimit.value = 20;
    
    setTimeout(() => {
        if (observerTarget.value) {
            if (!observer) {
                observer = new IntersectionObserver((entries) => {
                    const entry = entries.length > 0 ? entries[0] : null;
                    if (entry && entry.isIntersecting && displayLimit.value < filteredRecipes.value.length) {
                        displayLimit.value += 20;
                    }
                }, { rootMargin: '400px' });
            }
            observer.observe(observerTarget.value);
        }
    }, 100); // Wait for Dialog content to render
};

const onDialogHide = () => {
    recipeSearchQuery.value = '';
    activeCategory.value = 'Toutes';
    if (observer && observerTarget.value) {
        observer.unobserve(observerTarget.value);
    }
};
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        :header="props.header ?? 'Choisir une recette'"
        :style="{ width: '95vw', maxWidth: '800px' }"
        @show="onDialogShow"
        @hide="onDialogHide"
        :pt="{ content: { style: 'padding-bottom: 0;' } }"
    >
        <div class="flex flex-col gap-4 pt-2 pb-4 h-[70vh]">
            <!-- Barre de recherche Stitch -->
            <div class="flex flex-col gap-3">
                <div class="relative w-full">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 z-10"></i>
                    <InputText
                        id="recipe-search"
                        v-model="recipeSearchQuery"
                        placeholder="Rechercher un plat..."
                        class="w-full bg-surface-100 dark:bg-[#191a1f] border-none rounded-full py-3 pr-4 focus:ring-2 focus:ring-primary-500/20 transition-all text-surface-900 dark:text-surface-0 shadow-sm"
                        style="padding-left: 2.75rem;"
                    />
                </div>

                <!-- Filtres de catégories -->
                <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        v-for="cat in categories"
                        :key="cat"
                        @click="activeCategory = cat"
                        class="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap border"
                        :class="activeCategory === cat
                            ? 'bg-primary-600 dark:bg-primary-500 text-white border-primary-600 dark:border-primary-500'
                            : 'bg-surface-0 dark:bg-[#191a1f] border-surface-200 dark:border-[#2b2d31] text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-[#202126]'"
                    >
                        {{ cat }}
                    </button>
                </div>
            </div>

            <!-- Grille partagée en mode picker -->
            <div class="flex-1 overflow-y-auto pr-1">
                <RecipeGrid
                    mode="picker"
                    :recipes="visibleRecipes"
                    :selected-recipe-id="props.selectedRecipeId"
                    grid-cols="grid-cols-1 md:grid-cols-2"
                    @select="selectRecipe"
                />
                <!-- Pagination invisible via intersection observer -->
                <div ref="observerTarget" class="h-4 w-full"></div>
            </div>
        </div>

        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="close" />
        </template>
    </Dialog>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
