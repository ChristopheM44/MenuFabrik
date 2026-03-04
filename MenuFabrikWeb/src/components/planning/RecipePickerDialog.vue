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
    selectedRecipeId?: string;
    header?: string;
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
        :header="props.header ?? 'Choisir une recette'"
        :style="{ width: '90vw', maxWidth: '600px' }"
        @hide="recipeSearchQuery = ''"
    >
        <div class="flex flex-col gap-4 py-2 h-[60vh]">
            <!-- Champ de recherche — pattern PrimeVue 4 -->
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText
                    id="recipe-search"
                    name="recipe-search"
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
                    class="p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                    :class="props.selectedRecipeId === recipe.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/50 dark:border-primary-400'
                        : 'border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700'"
                    @click="selectRecipe(recipe)"
                >
                    <div class="flex flex-col">
                        <span
                            class="font-bold transition-colors flex items-center gap-2"
                            :class="props.selectedRecipeId === recipe.id
                                ? 'text-primary-700 dark:text-primary-500'
                                : 'text-surface-900 dark:text-surface-0 group-hover:text-primary-600 dark:group-hover:text-primary-300'"
                        >
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
                    <Button
                        :icon="props.selectedRecipeId === recipe.id ? 'pi pi-check' : 'pi pi-chevron-right'"
                        :severity="props.selectedRecipeId === recipe.id ? 'success' : 'secondary'"
                        text rounded
                    />
                </div>

                <div v-if="filteredRecipes.length === 0" class="text-center p-8 text-surface-500 dark:text-surface-400">
                    Aucune recette trouvée<span v-if="recipeSearchQuery"> pour "{{ recipeSearchQuery }}"</span>.
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="close" />
        </template>
    </Dialog>
</template>
