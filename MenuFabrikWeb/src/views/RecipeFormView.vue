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
import Rating from 'primevue/rating';
import Textarea from 'primevue/textarea';

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

const addIngredient = () => {
    if (!recipeForm.value.ingredients) {
        recipeForm.value.ingredients = [];
    }
    recipeForm.value.ingredients.push({ name: '', quantity: undefined, unit: '' });
};

const removeIngredient = (index: number) => {
    recipeForm.value.ingredients?.splice(index, 1);
};

const isAnalyzing = ref(false);

const analyzeWithAI = async () => {
    if (!recipeForm.value.instructions && !recipeForm.value.sourceURL) {
        formError.value = "Veuillez fournir des instructions ou un lien web (URL) plus haut pour lancer l'analyse IA.";
        return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        formError.value = "La clé d'API Gemini est manquante. Veuillez ajouter VITE_GEMINI_API_KEY dans le fichier .env.local et relancer le serveur.";
        return;
    }

    isAnalyzing.value = true;
    formError.value = '';

    try {
        let promptText = "";
        if (recipeForm.value.sourceURL) {
            promptText += `Analyse la recette contenue à cette URL (${recipeForm.value.sourceURL}). `;
        }
        if (recipeForm.value.instructions) {
            promptText += `Analyse également ces instructions/notes : ${recipeForm.value.instructions}. `;
        }

        const availableSides = sideDishStore.sideDishes.map(s => s.name).join(", ");

        promptText += `
**CONSIGNES STRICTES :**
1. Tu es un extracteur de données. Tu DOIS extraire EXACTEMENT les ingrédients présents dans le texte ou la page web, sans rien inventer.
2. Structure la liste des ingrédients de manière précise. Si le texte dit "oignon - 200 g d'oignon émincés", extrait: name="Oignon", quantity=200, unit="g". 
3. Déduis l'unité si elle est absente mais implicite. Par exemple, "1 reblochon" devient quantity=1, unit="pièce".
4. Extrais les instructions étape par étape.
5. Suggère 1 à 3 accompagnements appropriés pour ce plat, choisis **UNIQUEMENT** parmi cette liste stricte : [${availableSides}]. S'il s'agit d'un plat complet (ex: Tartiflette), laisse le tableau vide.

Réponds UNIQUEMENT avec un objet JSON strictement formaté (sans bloc markdown \`\`\`json) :
{
  "name": "Nom du plat trouvé",
  "instructions": "1. Faire chauffer...\\n2. Ajouter...",
  "category": "Viandes"|"Poissons"|"Végétarien"|"Rapide"|"Au Four"|"Pâtes"|"Soupes"|"Salades"|"Fast Food"|"Autre",
  "prepTime": 30,
  "ingredients": [
    {"name": "Reblochon", "quantity": 1, "unit": "pièce(s)"},
    {"name": "Pomme de terre", "quantity": 1, "unit": "kg"}
  ],
  "allergens": ["Gluten"],
  "sideDishes": ["Salade verte", "Pain"]
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur réseau: ${response.statusText}`);
        }

        const resData = await response.json();
        const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        // Nettoyage strict du markdown
        const cleanJsonStr = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const aiData = JSON.parse(cleanJsonStr);
        
        if (aiData.name && !recipeForm.value.name) recipeForm.value.name = aiData.name;
        if (aiData.instructions && !recipeForm.value.instructions) recipeForm.value.instructions = aiData.instructions;
        if (aiData.category) recipeForm.value.category = aiData.category as RecipeCategory;
        if (aiData.prepTime) recipeForm.value.prepTime = aiData.prepTime;
        if (aiData.ingredients && Array.isArray(aiData.ingredients)) {
            recipeForm.value.ingredients = aiData.ingredients;
        }
        
        // Match allergens based on string list
        if (aiData.allergens && Array.isArray(aiData.allergens)) {
            const matchedIds: string[] = [];
            for (const aiAllergen of aiData.allergens) {
                const found = allergenStore.allergens.find(a => a.name.toLowerCase() === aiAllergen.toLowerCase());
                if (found && found.id) {
                    matchedIds.push(found.id);
                }
            }
            recipeForm.value.allergenIds = [...new Set([...(recipeForm.value.allergenIds || []), ...matchedIds])];
        }

        // Match suggested side dishes
        if (aiData.sideDishes && Array.isArray(aiData.sideDishes)) {
            const matchedSideIds: string[] = [];
            for (const aiSide of aiData.sideDishes) {
                // Fuzzy matching for sides (e.g. "Salade verte" matching "Salade")
                const found = sideDishStore.sideDishes.find(s => 
                    s.name.toLowerCase().includes(aiSide.toLowerCase()) || 
                    aiSide.toLowerCase().includes(s.name.toLowerCase())
                );
                if (found && found.id) {
                    matchedSideIds.push(found.id);
                }
            }
            recipeForm.value.suggestedSideIds = [...new Set([...(recipeForm.value.suggestedSideIds || []), ...matchedSideIds])];
        }

    } catch (e: any) {
        formError.value = "Erreur lors de l'analyse IA. Vérifiez votre clé API ou votre URL. " + e.message;
        console.error("Gemini Error:", e);
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
                rating: recipeForm.value.rating || 0,
                mealType: recipeForm.value.mealType || MealType.BOTH,
                requiresFreeTime: recipeForm.value.requiresFreeTime || false,
                allergenIds: recipeForm.value.allergenIds || [],
                suggestedSideIds: recipeForm.value.suggestedSideIds || [],
                sourceURL: recipeForm.value.sourceURL || '',
                instructions: recipeForm.value.instructions || '',
                ingredients: (recipeForm.value.ingredients || []).filter(i => i.name && i.name.trim() !== '')
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

            <div class="flex flex-col gap-2">
                <label for="sourceURL" class="font-semibold">Lien Web (URL - Optionnel)</label>
                <InputText id="sourceURL" v-model="recipeForm.sourceURL" placeholder="Ex: https://cookidoo.fr/..." class="w-full font-mono text-sm" />
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

            <hr class="border-surface-200 dark:border-surface-700 my-2" />

            <!-- NOUVELLE SECTION: INSTRUCTIONS ET INGRÉDIENTS (Optionnels / Prêts pour l'IA) -->
            <div class="flex flex-col gap-2">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <label for="instructions" class="font-semibold">Instructions & Déroulé</label>
                    <Button icon="pi pi-sparkles" label="Autocompléter avec l'IA" size="small" severity="help" @click="analyzeWithAI" :loading="isAnalyzing" outlined class="w-full sm:w-auto text-xs sm:text-sm" />
                </div>
                <Textarea id="instructions" v-model="recipeForm.instructions" rows="5" placeholder="Saisir la recette, coller le texte depuis un blog..." class="w-full" autoResize />
            </div>

            <div class="flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <label class="font-semibold">Ingrédients</label>
                    <Button icon="pi pi-plus" label="Ajouter" size="small" text @click="addIngredient" />
                </div>
                
                <div v-if="recipeForm.ingredients && recipeForm.ingredients.length > 0" class="flex flex-col gap-3">
                    <div v-for="(ingredient, index) in recipeForm.ingredients" :key="index" class="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 bg-surface-50 dark:bg-surface-800/50 p-2 rounded-lg border border-surface-200 dark:border-surface-700">
                        <InputText v-model="ingredient.name" placeholder="Nom (ex: Farine)" class="w-full sm:flex-1 min-w-[120px]" />
                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <input v-model.number="ingredient.quantity" type="number" step="any" placeholder="Qté" class="p-inputtext p-component w-24 flex-shrink-0" />
                            <InputText v-model="ingredient.unit" placeholder="Unité (g, ml...)" class="w-24 flex-shrink-0" />
                            <Button icon="pi pi-trash" severity="danger" text rounded @click="removeIngredient(index)" tabindex="-1" class="ml-auto sm:ml-0" aria-label="Supprimer cet ingrédient" />
                        </div>
                    </div>
                </div>
                <div v-else class="text-sm text-surface-500 italic p-4 text-center border border-dashed rounded-lg border-surface-200 dark:border-surface-700">
                    Aucun ingrédient détaillé. (Vous pourrez utiliser l'assistant IA pour les extraire automatiquement plus tard !)
                </div>
            </div>

            <hr class="border-surface-200 dark:border-surface-700 my-2" />

            <div class="flex flex-col gap-2">
                <label class="font-semibold text-surface-900 dark:text-surface-0">Appréciation globale (Optionnel)</label>
                <div class="flex items-center gap-3">
                    <Rating v-model="recipeForm.rating" :stars="5" :cancel="true" class="text-primary-500" />
                    <span class="text-sm text-surface-500 min-w-[50px]">{{ recipeForm.rating || 0 }} / 5</span>
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
