<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Recipe } from '../../models/Recipe';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

const props = defineProps<{
    visible: boolean;
    recipes: Recipe[];
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'recipe-selected', recipe: Recipe): void;
}>();

const recipeSearchQuery = ref('');

// Filtrage + tri des recettes (recherche par nom ou catégorie)
const filteredRecipes = computed((): Recipe[] => {
    let list = [...props.recipes];
    if (recipeSearchQuery.value) {
        const query = recipeSearchQuery.value.toLowerCase();
        list = list.filter(r =>
            r.name.toLowerCase().includes(query) ||
            (r.category && r.category.toLowerCase().includes(query))
        );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

const selectRecipe = (recipe: Recipe) => {
    recipeSearchQuery.value = '';
    emit('recipe-selected', recipe);
    emit('update:visible', false);
};

const close = () => {
    recipeSearchQuery.value = '';
    emit('update:visible', false);
};
</script>

<template>
    <Dialog
        :visible="props.visible"
        @update:visible="emit('update:visible', $event)"
        modal
        header="Choisir une recette"
        :style="{ width: '90vw', maxWidth: '600px' }"
        @hide="recipeSearchQuery = ''"
    >
        <div class="flex flex-col gap-4 py-2 h-[60vh]">
            <!-- Champ de recherche — pattern PrimeVue 4 -->
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText
                    v-model="recipeSearchQuery"
                    placeholder="Rechercher un plat..."
                    class="w-full"
                />
            </IconField>

            <!-- Liste des recettes -->
            <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                <div
                    v-for="recipe in filteredRecipes"
                    :key="recipe.id"
                    class="p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors flex items-center justify-between group"
                    @click="selectRecipe(recipe)"
                >
                    <div class="flex flex-col">
                        <span class="font-bold text-surface-900 dark:text-surface-0 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-2">
                            {{ recipe.name }}
                        </span>
                        <div class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 mt-1">
                            <span v-if="recipe.rating && recipe.rating > 0" class="text-primary-500 flex items-center gap-1">
                                <i class="pi pi-star-fill text-[10px]"></i> {{ recipe.rating }}
                            </span>
                            <span><i class="pi pi-clock text-[10px]"></i> {{ recipe.prepTime }} min</span>
                            <span><i class="pi pi-tag"></i> {{ recipe.category }}</span>
                        </div>
                    </div>
                    <Button icon="pi pi-chevron-right" severity="secondary" text rounded />
                </div>

                <div v-if="filteredRecipes.length === 0" class="text-center p-8 text-surface-500 dark:text-surface-400">
                    Aucune recette trouvée.
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="close" />
        </template>
    </Dialog>
</template>
