<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMealStore } from '../stores/mealStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';

import type { Recipe } from '../models/Recipe';
import { RecipeShareService } from '../services/RecipeShareService';
import { useToast } from 'primevue/usetoast';
import { hydrateMeal } from '../utils/hydrateMeal';
import { formatDateLabel } from '../utils/dateUtils';
import { sortByNameFr } from '../utils/sortUtils';
import { getCategoryColor } from '../utils/categoryUtils';

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
    await Promise.all([
        recipeStore.ensureReady(),
        participantStore.ensureReady(),
        sideDishStore.ensureReady(),
        mealStore.ensureReady()
    ]);
});

// Récupération de l'objet repas et hydratation
const currentMealRaw = computed(() => mealStore.meals.find(m => m.id === mealId));

const hydratedMeal = computed(() => {
    if (!currentMealRaw.value) return null;
    return hydrateMeal(currentMealRaw.value, recipeStore, participantStore, sideDishStore);
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
    return formatDateLabel(hydratedMeal.value.date);
});


const sortedSideDishes = computed(() => sortByNameFr([...sideDishStore.sideDishes]));

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

// getCategoryColor est importée depuis categoryUtils (audit 3.7)
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
            <div class="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant">
                <Button icon="pi pi-arrow-left" text rounded severity="secondary" @click="goBack" />
                <div class="flex-1">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl sm:text-3xl font-bold text-on-surface">{{ formattedDate }}</h1>
                        <Badge :value="hydratedMeal.type" size="large" severity="info" />
                    </div>
                </div>
                
                <!-- Convives -->
                <div class="hidden sm:flex items-center gap-2">
                    <span class="text-sm text-on-surface-variant">Convives:</span>
                    <AvatarGroup>
                        <Avatar 
                            v-for="p in hydratedMeal.attendees" 
                            :key="p.id" 
                            :label="p.name.charAt(0).toUpperCase()" 
                            shape="circle" 
                            class="bg-primary-container text-on-primary-container font-bold text-sm border-2 border-surface-container-lowest"
                            title="p.name"
                        />
                    </AvatarGroup>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <!-- COLONNE GAUCHE : PLAT PRINCIPAL -->
                <div class="md:col-span-2 flex flex-col gap-4">
                    <h2 class="text-xl font-semibold flex items-center gap-2"><i class="pi pi-receipt text-primary-500"></i> Plat Principal</h2>
                    
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant relative overflow-hidden group">
                        
                        <div v-if="hydratedMeal.recipe" class="flex flex-col gap-4">
                            <!-- En-tête de la recette -->
                            <div class="flex justify-between items-start">
                                <div>
                                    <span class="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider uppercase mb-3 inline-block" :class="getCategoryColor(hydratedMeal.recipe.category)">
                                        {{ hydratedMeal.recipe.category || 'Non catégorisé' }}
                                    </span>
                                    <h3 class="text-2xl font-bold text-on-surface leading-tight">{{ hydratedMeal.recipe.name }}</h3>
                                    <Rating v-if="hydratedMeal.recipe.rating && hydratedMeal.recipe.rating > 0" :modelValue="hydratedMeal.recipe.rating" readonly :cancel="false" class="mt-2 text-sm" />
                                </div>
                                <div class="flex items-center gap-2">
                                    <Button icon="pi pi-share-alt" aria-label="Partager" v-tooltip.top="'Partager la recette'" size="small" text severity="info" @click="shareCurrentRecipe" />
                                    <Button icon="pi pi-file-edit" aria-label="Modifier" v-tooltip.top="'Modifier la recette'" size="small" text severity="secondary" @click="editRecipe(hydratedMeal.recipe.id)" />
                                    <Button icon="pi pi-pencil" label="Changer de plat" size="small" outlined @click="openRecipeDialog" />
                                </div>
                            </div>

                            <!-- Méta informations -->
                            <div class="flex flex-wrap items-center gap-4 text-on-surface-variant text-sm mt-2">
                                <span class="flex items-center gap-1"><i class="pi pi-clock"></i> Préparation: <strong>{{ hydratedMeal.recipe.prepTime }} min</strong></span>
                                <span v-if="hydratedMeal.recipe.servings" class="flex items-center gap-1"><i class="pi pi-users"></i> <strong>{{ hydratedMeal.recipe.servings }}</strong> parts</span>
                                <span v-if="hydratedMeal.recipe.instructions" class="flex items-center gap-1"><i class="pi pi-list"></i> Recette détaillée dispo</span>
                            </div>
                            
                            <!-- Allergènes si présents -->
                            <div v-if="hydratedMeal.recipe.allergenIds && hydratedMeal.recipe.allergenIds.length > 0" class="mt-2 text-sm">
                                <div class="text-xs text-surface-500 dark:text-surface-400 mb-1 font-semibold uppercase">Allergènes potentiels</div>
                                <div class="flex flex-wrap gap-1">
                                    <Badge value="⚠️ Attention: Vérifier allergènes" severity="warning" />
                                </div>
                            </div>
                            
                            <!-- Ingrédients structurés -->
                            <div v-if="hydratedMeal.recipe.ingredients && hydratedMeal.recipe.ingredients.length > 0" class="mt-4 pt-4 border-t border-outline-variant">
                                <h4 class="font-semibold mb-2 flex items-center gap-2"><i class="pi pi-shopping-bag text-primary"></i> Ingrédients</h4>
                                <ul class="list-disc pl-5 text-on-surface text-sm space-y-1">
                                    <li v-for="(ing, idx) in hydratedMeal.recipe.ingredients" :key="idx">
                                        <span class="font-medium">{{ ing.name }}</span>
                                        <span v-if="ing.quantity || ing.unit" class="text-on-surface-variant ml-1">
                                            - {{ ing.quantity }} {{ ing.unit }}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                            
                            <!-- Instructions complètes si requises -->
                            <div v-if="hydratedMeal.recipe.instructions" class="mt-4 pt-4 border-t border-outline-variant">
                                <h4 class="font-semibold mb-2">Instructions</h4>
                                <p class="text-on-surface whitespace-pre-wrap text-sm leading-relaxed">{{ hydratedMeal.recipe.instructions }}</p>
                            </div>

                            <!-- Lien Web -->
                            <div v-if="hydratedMeal.recipe.sourceURL" class="mt-6">
                                <RecipeSourceLinkButton :url="hydratedMeal.recipe.sourceURL" />
                            </div>

                        </div>
                        
                        <div v-else class="flex flex-col items-center justify-center py-8 text-on-surface-variant">
                            <i class="pi pi-calendar-plus text-4xl mb-3 opacity-50"></i>
                            <p class="mb-4">Aucun plat défini pour ce repas.</p>
                            <Button label="Choisir un plat" icon="pi pi-search" @click="openRecipeDialog" />
                        </div>
                        
                    </div>
                </div>

                <!-- COLONNE DROITE : ACCOMPAGNEMENTS -->
                <div class="flex flex-col gap-4">
                    <h2 class="text-xl font-semibold flex items-center gap-2"><i class="pi pi-tags text-green-500"></i> <label for="side-dishes-select">Accompagnements</label></h2>
                    
                    <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant flex flex-col gap-4">
                        <p class="text-sm text-on-surface-variant">Sélectionnez les accompagnements (légumes, féculents) pour compléter ce plat.</p>
                        
                        <MultiSelect 
                            id="side-dishes-wrapper"
                            name="side-dishes-select"
                            inputId="side-dishes-select"
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
                        
                        <div v-if="selectedSideDishIds.length === 0" class="text-sm italic text-on-surface-variant mt-2 text-center p-4 border border-dashed rounded-lg border-outline-variant">
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
</style>
