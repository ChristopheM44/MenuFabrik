<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMealStore } from '../stores/mealStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';
import type { Meal } from '../models/Meal';
import type { Recipe } from '../models/Recipe';
import { RecipeShareService } from '../services/RecipeShareService';
import { useToast } from 'primevue/usetoast';

// PrimeVue Components
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import RecipeSourceLinkButton from '../components/recipes/RecipeSourceLinkButton.vue';
import RecipePickerDialog from '../components/planning/RecipePickerDialog.vue';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Badge from 'primevue/badge';
import ProgressSpinner from 'primevue/progressspinner';
import Rating from 'primevue/rating';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const mealStore = useMealStore();
const recipeStore = useRecipeStore();
const participantStore = useParticipantStore();
const sideDishStore = useSideDishStore();

const mealId = route.params.id as string;

// State local pour les sélections
const selectedSideDishIds = ref<string[]>([]);
const showRecipeDialog = ref(false);
const isSaving = ref(false);

const isDataReady = computed(() => {
    return !recipeStore.isLoading && !participantStore.isLoading && !mealStore.isLoading && !sideDishStore.isLoading;
});

onMounted(async () => {
    if (recipeStore.recipes.length === 0) await recipeStore.fetchRecipes();
    if (participantStore.participants.length === 0) await participantStore.fetchParticipants();
    if (sideDishStore.sideDishes.length === 0) await sideDishStore.fetchSideDishes();
    if (mealStore.meals.length === 0) {
        mealStore.setupRealtimeListener();
    }
});

// Récupération de l'objet repas et hydratation
const currentMealRaw = computed(() => mealStore.meals.find(m => m.id === mealId));

const hydratedMeal = computed(() => {
    if (!currentMealRaw.value) return null;
    const m = currentMealRaw.value;
    return {
        ...m,
        recipe: m.recipeId ? recipeStore.recipes.find(r => r.id === m.recipeId) : undefined,
        attendees: m.attendeeIds ? participantStore.participants.filter(p => m.attendeeIds?.includes(p.id!)) : [],
        selectedSideDishes: m.selectedSideDishIds ? sideDishStore.sideDishes.filter(sd => m.selectedSideDishIds?.includes(sd.id!)) : []
    } as Meal;
});

// Initialiser le modèle du MultiSelect quand on a chargé les données la première fois
watch(currentMealRaw, (newMeal) => {
    if (newMeal && newMeal.selectedSideDishIds) {
        // Mettre à jour seulement si différent pour éviter les boucles en temps réel
        if (JSON.stringify(selectedSideDishIds.value) !== JSON.stringify(newMeal.selectedSideDishIds)) {
            selectedSideDishIds.value = [...newMeal.selectedSideDishIds];
        }
    }
}, { immediate: true });

// Date formatée pour le titre
const formattedDate = computed(() => {
    if (!hydratedMeal.value) return '';
    let dateObj = new Date(hydratedMeal.value.date);
    if (isNaN(dateObj.getTime())) return hydratedMeal.value.date;
    
    // Compensation fuseau horaire
    const offset = dateObj.getTimezoneOffset() * 60000;
    const localStr = (new Date(dateObj.getTime() - offset)).toISOString().split('T')[0];
    if (!localStr) return hydratedMeal.value.date;
    const parts = localStr.split('-');
    if (parts.length < 3) return hydratedMeal.value.date;
    
    // Explicitly parse to guarantee no undefined passing to Date
    const year = parseInt(parts[0] || '1970', 10);
    const month = parseInt(parts[1] || '1', 10) - 1;
    const day = parseInt(parts[2] || '1', 10);
    
    const localDate = new Date(year, month, day);

    const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(localDate);
    return label.charAt(0).toUpperCase() + label.slice(1);
});


const sortedSideDishes = computed(() => {
    return [...sideDishStore.sideDishes].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
});

// Actions
const goBack = () => {
    router.back();
};

const openRecipeDialog = () => {
    showRecipeDialog.value = true;
};

const replaceRecipe = async (recipe: Recipe) => {
    if (!mealId || !recipe.id) return;
    try {
        isSaving.value = true;
        await mealStore.updateMeal(mealId, { 
            recipeId: recipe.id,
            // Optionnel : on pourrait vider les accompagnements si la recette change fondamentalement
            // selectedSideDishIds: [] 
        });
        showRecipeDialog.value = false;
    } catch (e) {
        console.error("Erreur lors du changement de recette", e);
    } finally {
        isSaving.value = false;
    }
};

const editRecipe = (recipeId?: string) => {
    if (recipeId) {
        router.push(`/recipes/${recipeId}`);
    }
};

const shareCurrentRecipe = async () => {
    if (hydratedMeal.value?.recipe) {
        const result = await RecipeShareService.shareOrCopy(hydratedMeal.value.recipe);
        if (result.copied) {
            toast.add({ severity: 'success', summary: 'Lien copié', detail: 'Le lien de partage a été copié dans le presse-papier.', life: 3000 });
        }
    }
};

const updateSideDishes = async () => {
    if (!mealId) return;
    try {
        await mealStore.updateMeal(mealId, {
            selectedSideDishIds: [...selectedSideDishIds.value]
        });
    } catch (e) {
        console.error("Erreur mise à jour accompagnements", e);
    }
};

const getCategoryColor = (category?: string) => {
    if (category === 'Viandes') return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
    if (category === 'Poissons') return 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300';
    if (category === 'Végétarien') return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
    return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
};
</script>

<template>
    <div class="meal-detail max-w-4xl mx-auto p-4 animate-fadein pb-24">
        
        <div v-if="!isDataReady" class="flex justify-center p-12">
            <ProgressSpinner strokeWidth="4" />
        </div>

        <div v-else-if="!hydratedMeal" class="text-center p-12">
            <i class="pi pi-exclamation-triangle text-4xl text-orange-500 mb-4"></i>
            <h2 class="text-xl font-bold">Repas introuvable</h2>
            <Button label="Retourner à l'agenda" icon="pi pi-arrow-left" @click="goBack" class="mt-4" />
        </div>

        <div v-else class="flex flex-col gap-6">
            
            <!-- HEADER -->
            <div class="flex items-center gap-4 bg-surface-0 dark:bg-surface-900 p-4 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700">
                <Button icon="pi pi-arrow-left" text rounded severity="secondary" @click="goBack" />
                <div class="flex-1">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0">{{ formattedDate }}</h1>
                        <Badge :value="hydratedMeal.type" size="large" severity="info" />
                    </div>
                </div>
                
                <!-- Convives -->
                <div class="hidden sm:flex items-center gap-2">
                    <span class="text-sm text-surface-500">Convives:</span>
                    <AvatarGroup>
                        <Avatar 
                            v-for="p in hydratedMeal.attendees" 
                            :key="p.id" 
                            :label="p.name.charAt(0).toUpperCase()" 
                            shape="circle" 
                            class="bg-primary-100 text-primary-900 font-bold text-sm border-2 border-surface-0 dark:border-surface-900"
                            title="p.name"
                        />
                    </AvatarGroup>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <!-- COLONNE GAUCHE : PLAT PRINCIPAL -->
                <div class="md:col-span-2 flex flex-col gap-4">
                    <h2 class="text-xl font-semibold flex items-center gap-2"><i class="pi pi-receipt text-primary-500"></i> Plat Principal</h2>
                    
                    <div class="bg-surface-0 dark:bg-surface-900 p-6 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 relative overflow-hidden group">
                        
                        <div v-if="hydratedMeal.recipe" class="flex flex-col gap-4">
                            <!-- En-tête de la recette -->
                            <div class="flex justify-between items-start">
                                <div>
                                    <span class="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider uppercase mb-3 inline-block" :class="getCategoryColor(hydratedMeal.recipe.category)">
                                        {{ hydratedMeal.recipe.category || 'Non catégorisé' }}
                                    </span>
                                    <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 leading-tight">{{ hydratedMeal.recipe.name }}</h3>
                                    <Rating v-if="hydratedMeal.recipe.rating && hydratedMeal.recipe.rating > 0" :modelValue="hydratedMeal.recipe.rating" readonly :cancel="false" class="mt-2 text-sm" />
                                </div>
                                <div class="flex items-center gap-2">
                                    <Button icon="pi pi-share-alt" aria-label="Partager" v-tooltip.top="'Partager la recette'" size="small" text severity="info" @click="shareCurrentRecipe" />
                                    <Button icon="pi pi-file-edit" aria-label="Modifier" v-tooltip.top="'Modifier la recette'" size="small" text severity="secondary" @click="editRecipe(hydratedMeal.recipe.id)" />
                                    <Button icon="pi pi-pencil" label="Changer de plat" size="small" outlined @click="openRecipeDialog" />
                                </div>
                            </div>

                            <!-- Méta informations -->
                            <div class="flex flex-wrap items-center gap-4 text-surface-600 dark:text-surface-400 text-sm mt-2">
                                <span class="flex items-center gap-1"><i class="pi pi-clock"></i> Préparation: <strong>{{ hydratedMeal.recipe.prepTime }} min</strong></span>
                                <span v-if="hydratedMeal.recipe.instructions" class="flex items-center gap-1"><i class="pi pi-list"></i> Recette détaillée dispo</span>
                            </div>
                            
                            <!-- Allergènes si présents -->
                            <div v-if="hydratedMeal.recipe.allergenIds && hydratedMeal.recipe.allergenIds.length > 0" class="mt-2 text-sm">
                                <div class="text-xs text-surface-500 mb-1 font-semibold uppercase">Allergènes potentiels</div>
                                <div class="flex flex-wrap gap-1">
                                    <Badge value="⚠️ Attention: Vérifier allergènes" severity="warning" />
                                </div>
                            </div>
                            
                            <!-- Ingrédients structurés -->
                            <div v-if="hydratedMeal.recipe.ingredients && hydratedMeal.recipe.ingredients.length > 0" class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                                <h4 class="font-semibold mb-2 flex items-center gap-2"><i class="pi pi-shopping-bag text-primary-500"></i> Ingrédients</h4>
                                <ul class="list-disc pl-5 text-surface-700 dark:text-surface-300 text-sm space-y-1">
                                    <li v-for="(ing, idx) in hydratedMeal.recipe.ingredients" :key="idx">
                                        <span class="font-medium">{{ ing.name }}</span>
                                        <span v-if="ing.quantity || ing.unit" class="text-surface-500 ml-1">
                                            - {{ ing.quantity }} {{ ing.unit }}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                            
                            <!-- Instructions complètes si requises -->
                            <div v-if="hydratedMeal.recipe.instructions" class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                                <h4 class="font-semibold mb-2">Instructions</h4>
                                <p class="text-surface-700 dark:text-surface-300 whitespace-pre-wrap text-sm leading-relaxed">{{ hydratedMeal.recipe.instructions }}</p>
                            </div>

                            <!-- Lien Web -->
                            <div v-if="hydratedMeal.recipe.sourceURL" class="mt-6">
                                <RecipeSourceLinkButton :url="hydratedMeal.recipe.sourceURL" />
                            </div>

                        </div>
                        
                        <div v-else class="flex flex-col items-center justify-center py-8 text-surface-500">
                            <i class="pi pi-calendar-plus text-4xl mb-3 opacity-50"></i>
                            <p class="mb-4">Aucun plat défini pour ce repas.</p>
                            <Button label="Choisir un plat" icon="pi pi-search" @click="openRecipeDialog" />
                        </div>
                        
                    </div>
                </div>

                <!-- COLONNE DROITE : ACCOMPAGNEMENTS -->
                <div class="flex flex-col gap-4">
                    <h2 class="text-xl font-semibold flex items-center gap-2"><i class="pi pi-tags text-green-500"></i> Accompagnements</h2>
                    
                    <div class="bg-surface-0 dark:bg-surface-900 p-5 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col gap-4">
                        <p class="text-sm text-surface-500">Sélectionnez les accompagnements (légumes, féculents) pour compléter ce plat.</p>
                        
                        <MultiSelect 
                            v-model="selectedSideDishIds" 
                            :options="sortedSideDishes" 
                            optionLabel="name" 
                            optionValue="id"
                            placeholder="Choisir des accompagnements"
                            display="chip"
                            class="w-full"
                            filter
                            :maxSelectedLabels="3"
                            @change="updateSideDishes"
                        />
                        
                        <div v-if="selectedSideDishIds.length === 0" class="text-sm italic text-surface-400 mt-2 text-center p-4 border border-dashed rounded-lg border-surface-200 dark:border-surface-700">
                            Aucun accompagnement sélectionné.
                        </div>
                    </div>
                </div>

            </div>

        </div>

        <!-- MODAL CHANGEMENT DE RECETTE -->
        <RecipePickerDialog
            v-model:visible="showRecipeDialog"
            :recipes="recipeStore.recipes"
            :selectedRecipeId="hydratedMeal?.recipeId"
            header="Choisir une autre recette"
            @recipe-selected="replaceRecipe"
        />

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
