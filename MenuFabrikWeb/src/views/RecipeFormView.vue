<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipeStore } from '../stores/recipeStore';
import { useAllergenStore } from '../stores/allergenStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { GeminiService } from '../services/GeminiService';
import { ImageService } from '../services/ImageService';
import type { Recipe, RecipeCategory } from '../models/Recipe';
import { MealType } from '../models/Recipe';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import ToggleSwitch from 'primevue/toggleswitch';
import Rating from 'primevue/rating';
import Textarea from 'primevue/textarea';
import Panel from 'primevue/panel';

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
    rating: 0,
    allergenIds: [],
    suggestedSideIds: [],
    sourceURL: '',
    instructions: '',
    ingredients: []
});

const aiPromptText = ref('');
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

const addIngredient = () => {
    if (!recipeForm.value.ingredients) {
        recipeForm.value.ingredients = [];
    }
    recipeForm.value.ingredients.push({ name: '', quantity: undefined, unit: '' });
};

const removeIngredient = (index: number) => {
    recipeForm.value.ingredients?.splice(index, 1);
};

const addPreparationStep = () => {
    preparationSteps.value.push('');
};

const removePreparationStep = (index: number) => {
    preparationSteps.value.splice(index, 1);
};

const isAnalyzing = ref(false);

const analyzeWithAI = async () => {
    isAnalyzing.value = true;
    formError.value = '';

    try {
        const aiData = await GeminiService.analyzeRecipe(
            recipeForm.value.sourceURL || '',
            aiPromptText.value || '',
            sideDishStore.sideDishes
        );
        
        if (aiData.name && !recipeForm.value.name) recipeForm.value.name = aiData.name;
        if (aiData.instructions) {
            // Split the instructions by newline and filter out empty lines, stripping out numbers if present "1. "
            const newSteps = aiData.instructions
                .split(/\n+/)
                .map(step => step.replace(/^\d+[\.\)]\s*/, '').trim())
                .filter(step => step.length > 0);
            
            if (newSteps.length > 0) {
                 preparationSteps.value = newSteps;
            }
        }
        if (aiData.category) recipeForm.value.category = aiData.category as RecipeCategory;
        if (aiData.prepTime) recipeForm.value.prepTime = aiData.prepTime;
        if (aiData.ingredients && Array.isArray(aiData.ingredients)) {
            recipeForm.value.ingredients = aiData.ingredients as any;
        }
        
        // Map allergens match
        const matchedAllergenIds = GeminiService.mapAllergens(aiData.allergens, allergenStore.allergens);
        recipeForm.value.allergenIds = [...new Set([...(recipeForm.value.allergenIds || []), ...matchedAllergenIds])];

        // Map side dishes match
        const matchedSideIds = GeminiService.mapSideDishes(aiData.sideDishes, sideDishStore.sideDishes);
        recipeForm.value.suggestedSideIds = [...new Set([...(recipeForm.value.suggestedSideIds || []), ...matchedSideIds])];

    } catch (e: any) {
        formError.value = "Erreur IA : " + e.message;
        console.error("Gemini AI Analysis Error:", e);
    } finally {
        isAnalyzing.value = false;
    }
};

const sortedSideDishes = computed(() => {
    return [...sideDishStore.sideDishes].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
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
    if (!recipeForm.value.name || recipeForm.value.name.trim() === '') {
        formError.value = "Le nom de la recette est obligatoire.";
        return;
    }
    
    isSaving.value = true;
    formError.value = '';

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
            // Clean up potentially undefined stuff and force the type
            const newRecipe: Omit<Recipe, 'id'> = {
                name: recipeForm.value.name.trim(),
                category: recipeForm.value.category as RecipeCategory || 'Viande',
                prepTime: recipeForm.value.prepTime || 30,
                rating: recipeForm.value.rating || 0,
                mealType: recipeForm.value.mealType || MealType.BOTH,
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
            <Panel header="Assistant d'Importation IA" toggleable collapsed class="bg-primary-50 dark:bg-primary-900/30" :pt="{ root: { class: 'border border-primary-200 dark:border-primary-800 rounded-xl bg-primary-50/50 dark:bg-primary-900/30' }, header: { class: 'bg-primary-50 dark:bg-primary-800 rounded-t-xl text-primary-900 dark:text-primary-100' }, content: { class: 'bg-transparent rounded-b-xl' } }">
                <!-- Décoration de fond -->
                <i class="pi pi-sparkles absolute -right-6 -top-6 text-9xl text-primary-500/5 rotate-12 pointer-events-none"></i>
                
                <div class="flex flex-col gap-4 relative z-10 p-2">
                    <div class="flex flex-col gap-2">
                        <label for="sourceURL" class="font-semibold text-sm text-primary-900 dark:text-primary-400">1. Lien Web de la recette (URL)</label>
                        <div class="flex items-stretch rounded-md overflow-hidden bg-surface-0 dark:bg-[#202126] border border-surface-300 dark:border-[#2b2d31] focus-within:ring-1 focus-within:ring-primary-500 w-full">
                            <span class="flex items-center justify-center px-3 text-surface-500 dark:text-surface-400 border-r border-surface-300 dark:border-[#2b2d31] bg-surface-50 dark:bg-[#191a1f]"><i class="pi pi-link"></i></span>
                            <InputText id="sourceURL" v-model="recipeForm.sourceURL" placeholder="Ex: https://cookidoo.fr/..." class="w-full font-mono text-sm border-none shadow-none ring-0 focus:ring-0" />
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="instructions" class="font-semibold text-sm text-primary-900 dark:text-primary-400">2. Et / Ou Instructions et texte détaillé</label>
                        <Textarea id="instructions" v-model="aiPromptText" rows="4" placeholder="Saisir la recette, coller le texte depuis un blog..." class="w-full" autoResize />
                    </div>
                </div>
                
                <div class="flex justify-center sm:justify-end mt-4 relative z-10">
                    <Button icon="pi pi-sparkles" label="Compléter avec l'IA" @click="analyzeWithAI" :loading="isAnalyzing" class="w-full sm:w-auto shadow-md font-bold px-6 py-3" />
                </div>
            </Panel>

            <Panel header="Ingrédients" toggleable :pt="{ root: { class: 'border border-surface-200 dark:border-[#2b2d31] rounded-xl overflow-hidden' }, header: { class: 'bg-surface-50 dark:bg-[#202126]' }, content: { class: 'bg-surface-0 dark:bg-[#191a1f]' } }">
                <div class="flex flex-col gap-2 p-2">
                    <div class="flex justify-end items-center mb-2">
                        <Button icon="pi pi-plus" label="Ajouter" size="small" text @click="addIngredient" />
                    </div>
                    
                    <div v-if="recipeForm.ingredients && recipeForm.ingredients.length > 0" class="flex flex-col gap-3">
                        <div v-for="(ingredient, index) in recipeForm.ingredients" :key="index" class="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 bg-surface-100 dark:bg-[#202126] p-2 rounded-lg border border-surface-200 dark:border-[#2b2d31]">
                            <InputText v-model="ingredient.name" placeholder="Nom (ex: Farine)" class="w-full sm:flex-1 min-w-[120px]" />
                            <div class="flex items-center gap-2 w-full sm:w-auto">
                                <input v-model.number="ingredient.quantity" type="number" step="any" placeholder="Qté" class="p-inputtext p-component w-24 flex-shrink-0" />
                                <InputText v-model="ingredient.unit" placeholder="Unité (g, ml...)" class="w-24 flex-shrink-0" />
                                <Button icon="pi pi-trash" severity="danger" text rounded @click="removeIngredient(index)" tabindex="-1" class="ml-auto sm:ml-0" aria-label="Supprimer cet ingrédient" />
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-sm text-surface-500 dark:text-surface-400 italic p-4 text-center border border-dashed rounded-lg border-surface-200 dark:border-surface-700">
                        Aucun ingrédient détaillé. (Vous pourrez utiliser l'assistant IA pour les extraire automatiquement plus tard !)
                    </div>
                </div>
            </Panel>

            <Panel header="Étapes de préparation" toggleable :pt="{ root: { class: 'border border-surface-200 dark:border-[#2b2d31] rounded-xl overflow-hidden' }, header: { class: 'bg-surface-50 dark:bg-[#202126]' }, content: { class: 'bg-surface-0 dark:bg-[#191a1f]' } }">
                <div class="flex flex-col gap-2 p-2">
                    <div class="flex justify-end items-center mb-2">
                        <Button icon="pi pi-plus" label="Ajouter une étape" size="small" text @click="addPreparationStep" />
                    </div>
                    
                    <div v-if="preparationSteps && preparationSteps.length > 0" class="flex flex-col gap-3">
                        <div v-for="(_step, index) in preparationSteps" :key="index" class="flex flex-row flex-nowrap items-start gap-2 bg-surface-100 dark:bg-[#202126] p-3 rounded-lg border border-surface-200 dark:border-[#2b2d31]">
                            <div class="mt-2 font-bold text-surface-500 dark:text-surface-400 w-6 text-right shrink-0">{{ index + 1 }}.</div>
                            <Textarea v-model="preparationSteps[index]" rows="2" placeholder="Décrivez cette étape..." class="w-full" autoResize />
                            <Button icon="pi pi-trash" severity="danger" text rounded @click="removePreparationStep(index)" tabindex="-1" class="shrink-0 mt-1" aria-label="Supprimer cette étape" />
                        </div>
                    </div>
                    <div v-else class="text-sm text-surface-500 dark:text-surface-400 italic p-4 text-center border border-dashed rounded-lg border-surface-200 dark:border-surface-700">
                        Aucune étape de préparation. Ajoutez-en ou utilisez l'assistant IA.
                    </div>
                </div>
            </Panel>

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
.animate-fadein {
    animation: fadein 0.3s ease-out forwards;
}
@keyframes fadein {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
