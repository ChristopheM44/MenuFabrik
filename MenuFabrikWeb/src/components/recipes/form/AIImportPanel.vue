<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
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
const isOpen = ref(false);

const analyzeWithAI = async () => {
    isAnalyzing.value = true;
    emit('error', ''); // clear previous errors

    const urlInput = (props.recipeForm.sourceURL || '').trim();
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
        
        if (aiData.categories && Array.isArray(aiData.categories)) {
            const validCategories = aiData.categories.filter(c => Object.values(RecipeCategory).includes(c as RecipeCategory)) as RecipeCategory[];
            if (validCategories.length > 0) {
                updatedRecipe.categories = validCategories;
            }
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
    <section class="rounded-2xl bg-surface-container-low overflow-hidden">
        <!-- Header cliquable -->
        <div
            class="p-6 flex items-center gap-4 cursor-pointer select-none"
            @click="isOpen = !isOpen"
        >
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <i class="pi pi-sparkles text-primary text-lg"></i>
            </div>
            <div class="flex-1">
                <h3 class="font-headline font-bold text-primary">Assistant d'Importation IA</h3>
                <p class="text-sm text-on-surface-variant">Remplir automatiquement depuis une URL ou du texte</p>
            </div>
            <i
                class="pi pi-chevron-down text-on-surface-variant transition-transform duration-300"
                :class="{ 'rotate-180': isOpen }"
            ></i>
        </div>

        <!-- Contenu dépliable -->
        <div v-if="isOpen" class="px-6 pb-6 flex flex-col gap-4 border-t border-outline-variant">
            <p class="text-xs text-on-surface-variant pt-4">L'URL est reprise du champ "Lien source" ci-dessus. Collez du texte en complément si besoin.</p>

            <div class="flex flex-col gap-2">
                <label for="aiInstructions" class="font-label text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1">Texte de la recette (optionnel)</label>
                <Textarea
                    id="aiInstructions"
                    v-model="aiPromptText"
                    rows="4"
                    placeholder="Collez le texte depuis un blog, un livre, une application..."
                    class="w-full h-auto rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-on-surface placeholder:text-outline resize-none"
                    autoResize
                />
            </div>

            <Button
                icon="pi pi-sparkles"
                label="Compléter avec l'IA"
                @click="analyzeWithAI"
                :loading="isAnalyzing"
                class="w-full font-bold"
                severity="success"
            />
        </div>
    </section>
</template>
