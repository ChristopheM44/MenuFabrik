<script setup lang="ts">
import { ref } from 'vue';
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { GeminiService } from '../../../services/GeminiService';
import { useSideDishStore } from '../../../stores/sideDishStore';
import { useAllergenStore } from '../../../stores/allergenStore';
import { RecipeCategory } from '../../../models/Recipe';
import type { Recipe } from '../../../models/Recipe';

const props = defineProps<{
    recipeForm: Partial<Recipe>,
    preparationSteps: string[]
}>();

const emit = defineEmits<{
    (e: 'update:recipeForm', value: Partial<Recipe>): void,
    (e: 'update:preparationSteps', value: string[]): void,
    (e: 'error', message: string): void
}>();

const sideDishStore = useSideDishStore();
const allergenStore = useAllergenStore();

const isAnalyzing = ref(false);
const aiPromptText = ref('');
// Create local reactive copy of source URL to avoid mutating prop directly from InputText
const localSourceURL = ref(props.recipeForm.sourceURL || '');

const analyzeWithAI = async () => {
    isAnalyzing.value = true;
    emit('error', ''); // clear previous errors

    const urlInput = localSourceURL.value.trim() || '';
    const textInput = aiPromptText.value?.trim() || '';

    if (!urlInput && !textInput) {
        emit('error', "Veuillez saisir une URL ou coller le texte de la recette avant de lancer l'analyse IA.");
        isAnalyzing.value = false;
        return;
    }

    try {
        const aiData = await GeminiService.analyzeRecipe(
            urlInput,
            textInput,
            sideDishStore.sideDishes
        );

        if (!aiData || typeof aiData !== 'object') {
            throw new Error("La réponse de l'IA est invalide ou vide.");
        }

        const updatedRecipe = { ...props.recipeForm };
        updatedRecipe.sourceURL = urlInput; // Sync local copy back

        if (aiData.name && typeof aiData.name === 'string' && !updatedRecipe.name) {
            updatedRecipe.name = aiData.name.slice(0, 200);
        }
        
        let updatedSteps = [...props.preparationSteps];
        if (aiData.instructions && typeof aiData.instructions === 'string') {
            const newSteps = aiData.instructions
                .split(/\n+/)
                .map(step => step.replace(/^\d+[\.\)]\s*/, '').trim())
                .filter(step => step.length > 0);
            if (newSteps.length > 0) {
                updatedSteps = newSteps;
            }
        }
        
        if (aiData.category && Object.values(RecipeCategory).includes(aiData.category as RecipeCategory)) {
            updatedRecipe.category = aiData.category as RecipeCategory;
        }
        if (aiData.prepTime && typeof aiData.prepTime === 'number' && aiData.prepTime >= 0 && aiData.prepTime <= 1440) {
            updatedRecipe.prepTime = aiData.prepTime;
        }
        if (aiData.servings && typeof aiData.servings === 'number' && aiData.servings >= 1 && aiData.servings <= 20) {
            updatedRecipe.servings = aiData.servings;
        }
        
        if (aiData.ingredients && Array.isArray(aiData.ingredients)) {
            updatedRecipe.ingredients = aiData.ingredients
                .filter((ing): ing is { name: string; quantity?: number; unit?: string } =>
                    ing && typeof ing.name === 'string' && ing.name.trim().length > 0
                )
                .map(ing => ({
                    name: ing.name.trim(),
                    quantity: typeof ing.quantity === 'number' ? ing.quantity : undefined,
                    unit: typeof ing.unit === 'string' ? ing.unit.trim() : undefined
                }));
        }

        const matchedAllergenIds = GeminiService.mapAllergens(aiData.allergens, allergenStore.allergens);
        updatedRecipe.allergenIds = [...new Set([...(updatedRecipe.allergenIds || []), ...matchedAllergenIds])];

        const matchedSideIds = GeminiService.mapSideDishes(aiData.sideDishes, sideDishStore.sideDishes);
        updatedRecipe.suggestedSideIds = [...new Set([...(updatedRecipe.suggestedSideIds || []), ...matchedSideIds])];

        // Emit updates
        emit('update:recipeForm', updatedRecipe);
        if (updatedSteps.length > 0) {
            emit('update:preparationSteps', updatedSteps);
        }

    } catch (e: any) {
        emit('error', "Erreur IA : " + e.message);
        console.error("Gemini AI Analysis Error:", e);
    } finally {
        isAnalyzing.value = false;
    }
};
</script>

<template>
    <Panel header="Assistant d'Importation IA" toggleable collapsed class="bg-primary-50 dark:bg-primary-900/30" :pt="{ root: { class: 'border border-primary-200 dark:border-primary-800 rounded-xl bg-primary-50/50 dark:bg-primary-900/30' }, header: { class: 'bg-primary-50 dark:bg-primary-800 rounded-t-xl text-primary-900 dark:text-primary-100' }, content: { class: 'bg-transparent rounded-b-xl' } }">
        <i class="pi pi-sparkles absolute -right-6 -top-6 text-9xl text-primary-500/5 rotate-12 pointer-events-none"></i>
        
        <div class="flex flex-col gap-4 relative z-10 p-2">
            <div class="flex flex-col gap-2">
                <label for="sourceURL" class="font-semibold text-sm text-primary-900 dark:text-primary-400">1. Lien Web de la recette (URL)</label>
                <div class="flex items-stretch rounded-md overflow-hidden bg-surface-0 dark:bg-[#202126] border border-surface-300 dark:border-[#2b2d31] focus-within:ring-1 focus-within:ring-primary-500 w-full">
                    <span class="flex items-center justify-center px-3 text-surface-500 dark:text-surface-400 border-r border-surface-300 dark:border-[#2b2d31] bg-surface-50 dark:bg-[#191a1f]"><i class="pi pi-link"></i></span>
                    <InputText id="sourceURL" v-model="localSourceURL" placeholder="Ex: https://cookidoo.fr/..." class="w-full font-mono text-sm border-none shadow-none ring-0 focus:ring-0" />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label for="aiInstructions" class="font-semibold text-sm text-primary-900 dark:text-primary-400">2. Et / Ou Instructions et texte détaillé</label>
                <Textarea id="aiInstructions" v-model="aiPromptText" rows="4" placeholder="Saisir la recette, coller le texte depuis un blog..." class="w-full" autoResize />
            </div>
        </div>
        
        <div class="flex justify-center sm:justify-end mt-4 relative z-10">
            <Button icon="pi pi-sparkles" label="Compléter avec l'IA" @click="analyzeWithAI" :loading="isAnalyzing" class="w-full sm:w-auto shadow-md font-bold px-6 py-3" />
        </div>
    </Panel>
</template>
