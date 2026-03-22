<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import { useAllergenStore } from '../stores/allergenStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { ImageService } from '../services/ImageService';
import type { Recipe } from '../models/Recipe';
import { MealType, RecipeCategory } from '../models/Recipe';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import ToggleSwitch from 'primevue/toggleswitch';
import Rating from 'primevue/rating';

import AIImportPanel from '../components/recipes/form/AIImportPanel.vue';
import IngredientsStepPanel from '../components/recipes/form/IngredientsStepPanel.vue';
import InstructionsStepPanel from '../components/recipes/form/InstructionsStepPanel.vue';
import { sortByNameFr } from '../utils/sortUtils';

const route = useRoute();
const router = useRouter();
const recipeStore = useRecipeStore();
const allergenStore = useAllergenStore();
const sideDishStore = useSideDishStore();

const isEditing = computed(() => !!route.params.id && route.params.id !== 'new');
const formError = ref('');
const isSaving = ref(false);

// Liste complète issue du modèle RecipeCategory (1.6)
const categories: { label: string, value: RecipeCategory }[] = Object.values(RecipeCategory).map(v => ({ label: v, value: v }));

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
    rating: 0,
    allergenIds: [],
    suggestedSideIds: [],
    sourceURL: '',
    instructions: '',
    ingredients: []
});

const preparationSteps = ref<string[]>([]);
const newImageFile = ref<File | null>(null);
const localImagePreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const onFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        const file = target.files[0];
        if (file) {
            newImageFile.value = file;
            localImagePreview.value = URL.createObjectURL(file);
        }
    }
};

const removeImage = () => {
    newImageFile.value = null;
    localImagePreview.value = null;
    recipeForm.value.imageUrl = '';
    if (fileInput.value) fileInput.value.value = '';
};



const sortedAllergens = computed(() => sortByNameFr([...allergenStore.allergens]));
const sortedSideDishes = computed(() => sortByNameFr([...sideDishStore.sideDishes]));

onMounted(async () => {
    // S'assurer que les données liées sont chargées
    await Promise.all([
        allergenStore.ensureReady(),
        sideDishStore.ensureReady()
    ]);

    if (isEditing.value) {
        const id = route.params.id as string;
        await recipeStore.ensureReady();
        const existingRecipe = recipeStore.recipes.find(r => r.id === id);
        if (existingRecipe) {
            recipeForm.value = { ...existingRecipe };
            // Populate preparation steps from existing instructions
            if (recipeForm.value.instructions) {
                 preparationSteps.value = recipeForm.value.instructions
                    .split(/\n+/)
                    .map(step => step.replace(/^\d+[\.\)]\s*/, '').trim())
                    .filter(step => step.length > 0);
            }
        } else {
            router.push('/recipes');
        }
    }
});

const saveRecipe = async () => {
    formError.value = '';

    // Validation côté client complète (1.6)
    const name = recipeForm.value.name?.trim() || '';
    if (!name) {
        formError.value = "Le nom de la recette est obligatoire.";
        return;
    }
    if (name.length > 200) {
        formError.value = "Le nom de la recette ne peut pas dépasser 200 caractères.";
        return;
    }
    const prepTime = recipeForm.value.prepTime ?? 0;
    if (prepTime < 5 || prepTime > 1440) {
        formError.value = "Le temps de préparation doit être compris entre 5 et 1440 minutes.";
        return;
    }
    if (!recipeForm.value.mealType || !['Midi', 'Soir', 'Les Deux'].includes(recipeForm.value.mealType)) {
        formError.value = "Le type de repas est invalide.";
        return;
    }
    if (!recipeForm.value.category || !Object.values(RecipeCategory).includes(recipeForm.value.category as RecipeCategory)) {
        formError.value = "Veuillez sélectionner une catégorie valide.";
        return;
    }

    isSaving.value = true;

    try {
        // Aggregate preparation steps back into the instructions string before saving
        recipeForm.value.instructions = preparationSteps.value
            .filter(step => step.trim() !== '')
            .map((step, index) => `${index + 1}. ${step.trim()}`)
            .join('\n');

        if (isEditing.value && recipeForm.value.id) {
            // S'il y a une nouvelle image
            if (newImageFile.value) {
                // Option 2 : Transformer la photo en Base64 très compressé 
                const compressedBase64 = await ImageService.compressImageToBase64(newImageFile.value);
                recipeForm.value.imageUrl = compressedBase64;
            }
            await recipeStore.updateRecipe(recipeForm.value.id, recipeForm.value);
        } else {
            // name, prepTime, mealType et category sont déjà validés plus haut
            const newRecipe: Omit<Recipe, 'id'> = {
                name,
                category: recipeForm.value.category!,
                prepTime,
                rating: recipeForm.value.rating || 0,
                mealType: recipeForm.value.mealType!,
                requiresFreeTime: recipeForm.value.requiresFreeTime || false,
                allergenIds: recipeForm.value.allergenIds || [],
                suggestedSideIds: recipeForm.value.suggestedSideIds || [],
                sourceURL: recipeForm.value.sourceURL || '',
                imageUrl: recipeForm.value.imageUrl || '',
                instructions: recipeForm.value.instructions || '',
                ingredients: (recipeForm.value.ingredients || []).filter(i => i.name && i.name.trim() !== '')
            };
            const newId = await recipeStore.addRecipe(newRecipe);
            
            // Upload image AFTER having the new ID (or in this case, update the doc if a file is present)
            if (newImageFile.value && newId) {
                const compressedBase64 = await ImageService.compressImageToBase64(newImageFile.value);
                await recipeStore.updateRecipe(newId, { imageUrl: compressedBase64 });
            }
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
    <div class="recipe-form-view w-full max-w-3xl mx-auto p-4 md:p-8 animate-fadein pb-24">
        
        <div class="mb-6 flex items-center gap-3 mt-2 md:mt-4">
            <Button icon="pi pi-arrow-left" text rounded @click="cancel" aria-label="Retour" />
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">
                {{ isEditing ? 'Modifier la recette' : 'Nouvelle Recette' }}
            </h1>
        </div>

        <div class="bg-surface-0 dark:bg-[#191a1f] rounded-2xl shadow-sm md:border border-surface-200 dark:border-[#2b2d31] p-6 lg:p-8 flex flex-col gap-6">
            
            <!-- Dropzone Image -->
            <div class="relative w-full h-48 md:h-64 bg-surface-50 dark:bg-[#202126] rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-surface-300 dark:border-[#2b2d31] hover:bg-surface-100 dark:hover:bg-[#2b2d31]/50 transition-colors group cursor-pointer" @click="fileInput?.click()">
                <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="onFileSelect" />
                
                <img v-if="localImagePreview || recipeForm.imageUrl" :src="localImagePreview || recipeForm.imageUrl" class="absolute inset-0 w-full h-full object-cover z-0" />
                
                <div v-if="localImagePreview || recipeForm.imageUrl" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                    <Button icon="pi pi-trash" severity="danger" rounded aria-label="Supprimer l'image" @click.stop="removeImage" />
                </div>

                <div v-else class="flex flex-col items-center gap-2 text-surface-500 dark:text-surface-400 group-hover:scale-110 transition-transform">
                    <div class="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-500 mb-1">
                        <i class="pi pi-camera text-2xl"></i>
                    </div>
                    <span class="font-bold text-surface-700 dark:text-surface-300">Ajouter une belle photo</span>
                    <span class="text-xs opacity-70">JPG, PNG (max 5 Mo)</span>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label for="name" class="font-semibold">Nom de la recette *</label>
                <InputText id="name" v-model="recipeForm.name" placeholder="Ex: Poulet Basquaise" class="w-full text-lg" autofocus />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col gap-2">
                    <label for="category" class="font-semibold">Catégorie</label>
                    <Select id="category-wrapper" inputId="category" v-model="recipeForm.category" :options="categories" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="mealType" class="font-semibold">Type de Repas idéal</label>
                    <Select id="mealType-wrapper" inputId="mealType" v-model="recipeForm.mealType" :options="mealTypes" optionLabel="label" optionValue="value" class="w-full" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="prepTime" class="font-semibold">Temps de préparation (min)</label>
                    <InputNumber id="prepTime-wrapper" inputId="prepTime" v-model="recipeForm.prepTime" mode="decimal" showButtons :min="5" :max="240" :step="5" class="w-full" />
                </div>
                
                <div class="flex flex-col justify-center pt-2">
                    <div class="flex items-center gap-3">
                        <ToggleSwitch inputId="requiresFreeTime" v-model="recipeForm.requiresFreeTime" />
                        <div class="flex flex-col">
                            <label for="requiresFreeTime" class="font-semibold cursor-pointer">Nécessite du temps libre</label>
                            <span class="text-sm text-surface-500 dark:text-surface-400">Idéal pour le week-end ou jours de repos.</span>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="border-surface-200 dark:border-surface-700 my-2" />

            <!-- SECTION EXTRACTION IA -->
            <AIImportPanel 
                v-model:recipeForm="recipeForm"
                v-model:preparationSteps="preparationSteps"
                @error="err => formError = err"
            />

            <IngredientsStepPanel v-model="recipeForm" />

            <InstructionsStepPanel v-model="preparationSteps" />

            <hr class="border-surface-200 dark:border-surface-700 my-2" />

            <div class="flex flex-col gap-2">
                <label class="font-semibold text-surface-900 dark:text-surface-0">Appréciation globale (Optionnel)</label>
                <div class="flex items-center gap-3">
                    <Rating v-model="recipeForm.rating" :stars="5" :cancel="true" class="text-primary-500" />
                    <span class="text-sm text-surface-500 dark:text-surface-400 min-w-[50px]">{{ recipeForm.rating || 0 }} / 5</span>
                </div>
            </div>

            <hr class="border-surface-200 dark:border-surface-700 my-2" />

            <div class="flex flex-col gap-2">
                <label for="allergens" class="font-semibold">Allergènes Présents</label>
                <MultiSelect 
                    id="allergens-wrapper" 
                    inputId="allergens"
                    v-model="recipeForm.allergenIds" 
                    :options="sortedAllergens" 
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
                    id="sides-wrapper" 
                    inputId="sides"
                    v-model="recipeForm.suggestedSideIds" 
                    :options="sortedSideDishes" 
                    optionLabel="name" 
                    optionValue="id" 
                    display="chip"
                    placeholder="Suggestions d'accompagnements"
                    :maxSelectedLabels="20"
                    class="w-full" 
                    filter
                    :loading="sideDishStore.isLoading"
                />
            </div>

            <div v-if="formError" class="p-3 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
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
</style>
