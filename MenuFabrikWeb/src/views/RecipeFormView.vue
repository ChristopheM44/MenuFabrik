<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import { useAllergenStore } from '../stores/allergenStore';
import { useSideDishStore } from '../stores/sideDishStore';
import type { Recipe, RecipeCategory } from '../models/Recipe';
import { MealType } from '../models/Recipe';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import ToggleSwitch from 'primevue/toggleswitch';

const route = useRoute();
const router = useRouter();
const recipeStore = useRecipeStore();
const allergenStore = useAllergenStore();
const sideDishStore = useSideDishStore();

const isEditing = computed(() => !!route.params.id && route.params.id !== 'new');
const formError = ref('');
const isSaving = ref(false);

const categories: { label: string, value: string }[] = [
    { label: 'Viandes', value: 'Viandes' },
    { label: 'Poissons', value: 'Poissons' },
    { label: 'Végétarien', value: 'Végétarien' },
    { label: 'Rapide', value: 'Rapide' },
    { label: 'Au Four', value: 'Au Four' }
];

const mealTypes: { label: string, value: MealType }[] = [
    { label: 'Midi', value: MealType.LUNCH },
    { label: 'Soir', value: MealType.DINNER },
    { label: 'Les Deux', value: MealType.BOTH }
];

const recipeForm = ref<Partial<Recipe>>({
    name: '',
    category: 'Viandes',
    prepTime: 30,
    mealType: MealType.BOTH,
    requiresFreeTime: false,
    allergenIds: [],
    suggestedSideIds: []
});

onMounted(async () => {
    // S'assurer que les données liées sont chargées
    if (allergenStore.allergens.length === 0) await allergenStore.fetchAllergens();
    if (sideDishStore.sideDishes.length === 0) await sideDishStore.fetchSideDishes();

    if (isEditing.value) {
        const id = route.params.id as string;
        if (recipeStore.recipes.length === 0) {
            await recipeStore.fetchRecipes();
        }
        const existingRecipe = recipeStore.recipes.find(r => r.id === id);
        if (existingRecipe) {
            recipeForm.value = { ...existingRecipe };
        } else {
            router.push('/recipes');
        }
    }
});

const saveRecipe = async () => {
    if (!recipeForm.value.name || recipeForm.value.name.trim() === '') {
        formError.value = "Le nom de la recette est obligatoire.";
        return;
    }
    
    isSaving.value = true;
    formError.value = '';

    try {
        if (isEditing.value && recipeForm.value.id) {
            await recipeStore.updateRecipe(recipeForm.value.id, recipeForm.value);
        } else {
            // Clean up potentially undefined stuff and force the type
            const newRecipe: Omit<Recipe, 'id'> = {
                name: recipeForm.value.name.trim(),
                category: recipeForm.value.category as RecipeCategory || 'Viande',
                prepTime: recipeForm.value.prepTime || 30,
                mealType: recipeForm.value.mealType || MealType.BOTH,
                requiresFreeTime: recipeForm.value.requiresFreeTime || false,
                allergenIds: recipeForm.value.allergenIds || [],
                suggestedSideIds: recipeForm.value.suggestedSideIds || []
            };
            await recipeStore.addRecipe(newRecipe);
        }
        router.push('/recipes');
    } catch (e: any) {
        formError.value = "Erreur lors de la sauvegarde: " + e.message;
    } finally {
        isSaving.value = false;
    }
};

const cancel = () => {
    router.push('/recipes');
};
</script>

<template>
    <div class="recipe-form-view w-full max-w-3xl mx-auto p-4 animate-fadein">
        
        <div class="mb-6 flex items-center gap-3">
            <Button icon="pi pi-arrow-left" text rounded @click="cancel" aria-label="Retour" />
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">
                {{ isEditing ? 'Modifier la recette' : 'Nouvelle Recette' }}
            </h1>
        </div>

        <div class="bg-white dark:bg-surface-900 rounded-xl shadow-sm p-6 flex flex-col gap-6">
            
            <div class="flex flex-col gap-2">
                <label for="name" class="font-semibold">Nom de la recette *</label>
                <InputText id="name" v-model="recipeForm.name" placeholder="Ex: Poulet Basquaise" class="w-full text-lg" autofocus />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col gap-2">
                    <label for="category" class="font-semibold">Catégorie</label>
                    <Select id="category" v-model="recipeForm.category" :options="categories" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="mealType" class="font-semibold">Type de Repas idéal</label>
                    <Select id="mealType" v-model="recipeForm.mealType" :options="mealTypes" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="prepTime" class="font-semibold">Temps de préparation (min)</label>
                    <InputNumber id="prepTime" v-model="recipeForm.prepTime" inputId="minmax-buttons" mode="decimal" showButtons :min="5" :max="240" :step="5" class="w-full" />
                </div>
                
                <div class="flex flex-col justify-center pt-2">
                    <div class="flex items-center gap-3">
                        <ToggleSwitch inputId="requiresFreeTime" v-model="recipeForm.requiresFreeTime" />
                        <div class="flex flex-col">
                            <label for="requiresFreeTime" class="font-semibold cursor-pointer">Nécessite du temps libre</label>
                            <span class="text-sm text-surface-500">Idéal pour le week-end ou jours de repos.</span>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="border-surface-200 dark:border-surface-700 my-2" />

            <div class="flex flex-col gap-2">
                <label for="allergens" class="font-semibold">Allergènes Présents</label>
                <MultiSelect 
                    id="allergens" 
                    v-model="recipeForm.allergenIds" 
                    :options="allergenStore.allergens" 
                    optionLabel="name" 
                    optionValue="id" 
                    display="chip"
                    placeholder="Sélectionner des allergènes"
                    :maxSelectedLabels="3" 
                    class="w-full" 
                    :loading="allergenStore.isLoading"
                />
            </div>

            <div class="flex flex-col gap-2">
                <label for="sides" class="font-semibold">Accompagnements Suggérés</label>
                <MultiSelect 
                    id="sides" 
                    v-model="recipeForm.suggestedSideIds" 
                    :options="sideDishStore.sideDishes" 
                    optionLabel="name" 
                    optionValue="id" 
                    display="chip"
                    placeholder="Suggestions d'accompagnements"
                    :maxSelectedLabels="4" 
                    class="w-full" 
                    filter
                    :loading="sideDishStore.isLoading"
                />
            </div>

            <div v-if="formError" class="p-3 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                <i class="pi pi-exclamation-circle"></i>
                {{ formError }}
            </div>

            <div class="flex justify-end gap-3 mt-4">
                <Button label="Annuler" severity="secondary" outlined @click="cancel" />
                <Button :label="isEditing ? 'Enregistrer' : 'Créer la recette'" icon="pi pi-check" @click="saveRecipe" :loading="isSaving" />
            </div>

        </div>
    </div>
</template>

<style scoped>
.animate-fadein {
    animation: fadein 0.3s ease-out forwards;
}
@keyframes fadein {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
