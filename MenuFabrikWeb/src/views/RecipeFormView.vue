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
import PageHeader from '../components/layout/PageHeader.vue';
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
const categories: { label: string, value: RecipeCategory }[] = Object.values(RecipeCategory).map(v => ({ label: v, value: v })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));

const mealTypes: { label: string, value: MealType }[] = [
    { label: 'Midi', value: MealType.LUNCH },
    { label: 'Soir', value: MealType.DINNER },
    { label: 'Les Deux', value: MealType.BOTH }
];

const recipeForm = ref<Partial<Recipe>>({
    name: '',
    categories: ['Viandes'],
    prepTime: 30,
    servings: 4,
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
            if (!recipeForm.value.servings) recipeForm.value.servings = 4;
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
    if (!recipeForm.value.categories || recipeForm.value.categories.length === 0) {
        formError.value = "Veuillez sélectionner au moins une catégorie.";
        return;
    }
    if (!recipeForm.value.categories.every(c => Object.values(RecipeCategory).includes(c as RecipeCategory))) {
        formError.value = "Une des catégories sélectionnées est invalide.";
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
            const cleanedIngredients = (recipeForm.value.ingredients || [])
                .filter(i => i.name && i.name.trim() !== '')
                .map(({ name, quantity, unit, department }) => ({
                    name: name.trim(),
                    ...(quantity !== undefined && quantity !== null && { quantity }),
                    ...(unit ? { unit } : {}),
                    ...(department ? { department } : {})
                }));
            await recipeStore.updateRecipe(recipeForm.value.id, { ...recipeForm.value, ingredients: cleanedIngredients });
        } else {
            // name, prepTime, mealType et categories sont déjà validés plus haut
            const newRecipe: Omit<Recipe, 'id'> = {
                name,
                categories: recipeForm.value.categories as RecipeCategory[],
                prepTime,
                servings: recipeForm.value.servings || 4,
                rating: recipeForm.value.rating || 0,
                mealType: recipeForm.value.mealType!,
                requiresFreeTime: recipeForm.value.requiresFreeTime || false,
                allergenIds: recipeForm.value.allergenIds || [],
                suggestedSideIds: recipeForm.value.suggestedSideIds || [],
                sourceURL: recipeForm.value.sourceURL || '',
                imageUrl: recipeForm.value.imageUrl || '',
                instructions: recipeForm.value.instructions || '',
                ingredients: (recipeForm.value.ingredients || [])
                    .filter(i => i.name && i.name.trim() !== '')
                    .map(({ name, quantity, unit, department }) => ({
                        name: name.trim(),
                        ...(quantity !== undefined && { quantity }),
                        ...(unit ? { unit } : {}),
                        ...(department ? { department } : {})
                    }))
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
  <div class="min-h-screen bg-background text-on-surface antialiased">
    <main class="py-8 pb-32 max-w-2xl mx-auto px-6">
      <!-- Retour -->
      <button @click="cancel" type="button" class="flex items-center gap-2 mb-4 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95">
        <i class="pi pi-arrow-left text-sm"></i>
        <span class="text-sm font-medium">Retour aux recettes</span>
      </button>

      <PageHeader
        icon="pi pi-file-edit"
        label="Recette"
        :title="isEditing ? 'Modifier la recette' : 'Nouvelle Recette'"
      >
        <template #actions>
          <button
            v-if="isEditing && recipeForm.instructions"
            @click="router.push({ name: 'cooking', params: { recipeId: recipeForm.id } })"
            type="button"
            class="w-11 h-11 rounded-full bg-green-600 text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            aria-label="Cuisiner"
          >
            <i class="pi pi-play text-lg"></i>
          </button>
          <button @click="saveRecipe" :disabled="isSaving" type="button" class="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" aria-label="Enregistrer">
            <i v-if="isSaving" class="pi pi-spin pi-spinner text-lg"></i>
            <i v-else class="pi pi-save text-lg"></i>
          </button>
        </template>
      </PageHeader>

      <form @submit.prevent="saveRecipe" class="space-y-10">

        <!-- Error Message -->
        <div v-if="formError" class="p-4 bg-error-container text-on-error-container rounded-xl text-sm flex items-center gap-3">
          <span class="material-symbols-outlined">error</span>
          <span>{{ formError }}</span>
        </div>

        <!-- Photo Upload Dropzone -->
        <section>
          <div @click="fileInput?.click()" class="group relative flex flex-col items-center justify-center w-full aspect-[4/3] border-2 border-dashed border-outline-variant bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer overflow-hidden">
            <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="onFileSelect" />
            
            <img v-if="localImagePreview || recipeForm.imageUrl" :src="localImagePreview || recipeForm.imageUrl" class="absolute inset-0 w-full h-full object-cover z-0" />
            
            <div v-if="localImagePreview || recipeForm.imageUrl" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
              <Button icon="pi pi-trash" severity="danger" rounded aria-label="Supprimer l'image" @click.stop="removeImage" />
            </div>

            <div v-else class="flex flex-col items-center gap-3 text-center px-8">
              <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">add_a_photo</span>
              </div>
              <div class="space-y-1">
                <p class="font-headline font-bold text-on-surface">Ajouter une belle photo</p>
                <p class="text-sm text-on-surface-variant">JPG, PNG max 5 Mo</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Basic Info Grid -->
        <section class="space-y-6">
          <div class="space-y-2">
            <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Nom de la recette</label>
            <InputText v-model="recipeForm.name" class="w-full h-14 px-5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-body text-on-surface placeholder:text-outline" placeholder="Ex: Poulet Basquaise" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Catégorie</label>
              <MultiSelect v-model="recipeForm.categories" :options="categories" optionLabel="label" optionValue="value" display="chip" placeholder="Sélectionner des catégories" :maxSelectedLabels="5" class="w-full min-h-[56px] rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-on-surface flex items-center px-3 py-1" />
            </div>

            <div class="space-y-2">
              <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Type de Repas idéal</label>
              <Select v-model="recipeForm.mealType" :options="mealTypes" optionLabel="label" optionValue="value" class="w-full h-14 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-on-surface flex items-center px-3" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Temps de préparation (min)</label>
              <InputNumber v-model="recipeForm.prepTime" mode="decimal" showButtons :min="5" :max="240" :step="5" class="w-full h-14 bg-surface-container-high rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all text-on-surface" inputClass="w-full h-14 bg-transparent border-none px-5 font-body text-on-surface focus:ring-0" />
            </div>
            <div class="space-y-2">
              <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Nombre de parts</label>
              <InputNumber v-model="recipeForm.servings" mode="decimal" showButtons :min="1" :max="20" :step="1" class="w-full h-14 bg-surface-container-high rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all text-on-surface" inputClass="w-full h-14 bg-transparent border-none px-5 font-body text-on-surface focus:ring-0" />
            </div>
          </div>

          <!-- Rating -->
          <div class="space-y-2">
            <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Appréciation globale (Optionnel)</label>
            <div class="flex items-center gap-3 h-14 px-5 rounded-xl bg-surface-container-high">
              <Rating v-model="recipeForm.rating" :stars="5" :cancel="true" class="text-primary" />
              <span class="text-sm font-body text-on-surface-variant ml-auto">{{ recipeForm.rating || 0 }} / 5</span>
            </div>
          </div>

          <!-- Allergènes -->
          <div class="space-y-2">
            <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Allergènes Présents</label>
            <MultiSelect v-model="recipeForm.allergenIds" :options="sortedAllergens" optionLabel="name" optionValue="id" display="chip" placeholder="Sélectionner des allergènes" :maxSelectedLabels="3" class="w-full min-h-[56px] rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-on-surface flex items-center px-3 py-1" :loading="allergenStore.isLoading" />
          </div>

          <!-- Accompagnements -->
          <div class="space-y-2">
            <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Accompagnements Suggérés</label>
            <MultiSelect v-model="recipeForm.suggestedSideIds" :options="sortedSideDishes" optionLabel="name" optionValue="id" display="chip" placeholder="Suggestions d'accompagnements" :maxSelectedLabels="20" filter class="w-full min-h-[56px] rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-on-surface flex items-center px-3 py-1" :loading="sideDishStore.isLoading" />
          </div>

          <!-- Lien source -->
          <div class="space-y-2">
            <label class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Lien source (URL)</label>
            <div class="flex items-center h-14 rounded-xl bg-surface-container-high overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <span class="flex items-center justify-center w-12 h-full text-on-surface-variant shrink-0">
                <i class="pi pi-link"></i>
              </span>
              <InputText v-model="recipeForm.sourceURL" placeholder="Ex: https://cookidoo.fr/..." class="flex-1 h-full bg-transparent border-none shadow-none ring-0 focus:ring-0 font-body text-on-surface text-sm placeholder:text-outline pr-4" />
            </div>
          </div>
        </section>

        <!-- Toggle Section -->
        <section class="p-6 rounded-2xl bg-surface-container-low flex items-center justify-between cursor-pointer" @click="recipeForm.requiresFreeTime = !recipeForm.requiresFreeTime">
          <div class="space-y-1">
            <h3 class="font-headline font-bold text-on-surface">Nécessite du temps libre</h3>
            <p class="text-sm text-on-surface-variant">Idéal pour le week-end ou jours de repos</p>
          </div>
          <ToggleSwitch v-model="recipeForm.requiresFreeTime" @click.stop />
        </section>

        <!-- AI Import Section -->
        <AIImportPanel 
            v-model:recipeForm="recipeForm"
            v-model:preparationSteps="preparationSteps"
            @error="err => formError = err"
        />

        <!-- Ingredients Section -->
        <IngredientsStepPanel v-model="recipeForm" />

        <!-- Instructions Section -->
        <InstructionsStepPanel v-model="preparationSteps" />

      </form>
    </main>
  </div>
</template>

<style scoped>
</style>
