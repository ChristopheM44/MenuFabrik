<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMealStore } from '../stores/mealStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { MenuGeneratorEngine } from '../services/MenuGeneratorEngine';
import { useRouter } from 'vue-router';
import type { Meal } from '../models/Meal';
import { MealStatus, MealTime } from '../models/Meal';
import MealCardView from '../components/MealCardView.vue';
import PlanMealDialog from '../components/planning/PlanMealDialog.vue';

// PrimeVue
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';

const mealStore = useMealStore();
const recipeStore = useRecipeStore();
const participantStore = useParticipantStore();
const sideDishStore = useSideDishStore();
const router = useRouter();

const isDataReady = computed(() => {
    return !recipeStore.isLoading && !participantStore.isLoading && !mealStore.isLoading;
});

// Helper pour format YYYY-MM-DD local
const getLocalISODate = (date: Date): string => {
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().split('T')[0];
    return localISOTime as string;
};

// --- ÉTAT PLANIFICATION ---
const showPlanDialog = ref(false);
const isGeneratingGlobal = ref(false);

// --- ÉTAT SUPPRESSION ---
const showDeleteConfirmDialog = ref(false);
const deleteTargetType = ref<'meal' | 'day'>('meal');
const deleteTargetId = ref<string>(''); // id du meal ou dateKey

onMounted(async () => {
    if (recipeStore.recipes.length === 0) await recipeStore.fetchRecipes();
    if (participantStore.participants.length === 0) await participantStore.fetchParticipants();
    if (sideDishStore.sideDishes.length === 0) await sideDishStore.fetchSideDishes();
    if (mealStore.meals.length === 0) {
        mealStore.setupRealtimeListener();
    }
});

const getHydratedMeals = computed(() => {
    return mealStore.meals.map(meal => {
        return {
            ...meal,
            recipe: meal.recipeId ? recipeStore.recipes.find(r => r.id === meal.recipeId) : undefined,
            attendees: meal.attendeeIds ? participantStore.participants.filter(p => meal.attendeeIds.includes(p.id!)) : [],
            selectedSideDishes: meal.selectedSideDishIds ? sideDishStore.sideDishes.filter(sd => meal.selectedSideDishIds.includes(sd.id!)) : []
        } as Meal;
    });
});

const mealsByDate = computed(() => {
    const groups: Record<string, Meal[]> = {};
    
    getHydratedMeals.value.forEach(meal => {
        let dateObj = new Date(meal.date);
        if (isNaN(dateObj.getTime())) {
             dateObj = new Date();
        }
        const dateKey = getLocalISODate(dateObj);
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(meal);
    });

    const sortedKeys = Object.keys(groups).sort();
    
    return sortedKeys.map(key => {
        const mealsForDay = groups[key] || [];
        const sortedMealsDay = mealsForDay.sort((a, b) => {
            if (a.type === MealTime.LUNCH && b.type === MealTime.DINNER) return -1;
            if (a.type === MealTime.DINNER && b.type === MealTime.LUNCH) return 1;
            return 0;
        });

        const parts = key.split('-');
        const year = parseInt(parts[0] || '1970', 10);
        const month = parseInt(parts[1] || '1', 10) - 1;
        const day = parseInt(parts[2] || '1', 10);
        
        const d_date = new Date(year, month, day);
        const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d_date);
        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

        return {
            dateKey: key,
            label: formattedLabel,
            meals: sortedMealsDay
        };
    });
});

// Indique s'il y a des repas prévus sans recettes (pour activer le bouton Générer)
const hasEmptySkeletons = computed(() => {
    // on vérifie que le meal existe, est PLANNED, et n'a pas de recette
    return mealStore.meals.some(m => (!m.recipeId || m.recipeId === '') && m.status === MealStatus.PLANNED);
});


// -------------------------------
// ACTIONS
// -------------------------------

const openPlanDialog = () => {
    showPlanDialog.value = true;
};

// 2. Générer globalement tous les skeletons vides
const generateAllEmptySkeletons = async () => {
    if (!hasEmptySkeletons.value) return;
    
    isGeneratingGlobal.value = true;
    try {
        const emptyMeals = mealStore.meals.filter(m => (!m.recipeId || m.recipeId === '') && m.status === MealStatus.PLANNED).map(m => ({...m}));
        
        if (emptyMeals.length > 0) {
            MenuGeneratorEngine.generateMenu(
                emptyMeals, 
                recipeStore.recipes, 
                participantStore.participants
            );
            await mealStore.saveMealsBatch(emptyMeals);
        }
    } catch (e) {
        console.error("Erreur Génération globale:", e);
        alert("Une erreur est survenue lors de la génération.");
    } finally {
        isGeneratingGlobal.value = false;
    }
};

// 3. Générer unitairement (ou proposer alternative)
const generateSingleMeal = async (meal: Meal) => {
    try {
        const mealToUpdate = { ...meal };
        
        if (mealToUpdate.recipeId) {
            MenuGeneratorEngine.generateAlternative(
                mealToUpdate,
                recipeStore.recipes,
                participantStore.participants,
                mealStore.meals
            );
        } else {
            MenuGeneratorEngine.generateMenu(
                [mealToUpdate], 
                recipeStore.recipes, 
                participantStore.participants
            );
        }
        
        if (mealToUpdate.id) {
            await mealStore.updateMeal(mealToUpdate.id, {
                recipeId: mealToUpdate.recipeId,
                selectedSideDishIds: mealToUpdate.selectedSideDishIds
            });
        }
    } catch (e) {
        console.error("Erreur lors de la génération ciblée:", e);
    }
};

// 4. Changement Statut Repas
const changeMealStatus = async (meal: Meal, newStatus: MealStatus) => {
    if (!meal.id) return;
    try {
        const updateData: Partial<Meal> = { status: newStatus };
        if (newStatus !== MealStatus.PLANNED) {
            updateData.recipeId = '';
            updateData.selectedSideDishIds = [];
        }
        await mealStore.updateMeal(meal.id, updateData);
        
        // Si on repasse en PLANNED et qu'on n'avait pas de recette,
        // on pourrait déclencher la génération ici (comportement iPad).
        if (newStatus === MealStatus.PLANNED && !meal.recipeId) {
            // on déclenche silencieusement une génération pour ce repas
            const mealToUpdate = { ...meal, status: MealStatus.PLANNED, recipeId: '', selectedSideDishIds: [] };
             MenuGeneratorEngine.generateMenu(
                [mealToUpdate], 
                recipeStore.recipes, 
                participantStore.participants
            );
            if (mealToUpdate.recipeId) {
                await mealStore.updateMeal(meal.id, {
                    recipeId: mealToUpdate.recipeId,
                    selectedSideDishIds: mealToUpdate.selectedSideDishIds
                });
            }
        }
    } catch (e) {
        console.error("Erreur lors du changement de statut:", e);
    }
}

// 5. Suppression
const confirmDeleteMeal = (meal: Meal) => {
    if (!meal.id) return;
    deleteTargetType.value = 'meal';
    deleteTargetId.value = meal.id;
    showDeleteConfirmDialog.value = true;
};

const confirmDeleteDay = (dateKey: string) => {
    deleteTargetType.value = 'day';
    deleteTargetId.value = dateKey;
    showDeleteConfirmDialog.value = true;
};

const executeDelete = async () => {
    showDeleteConfirmDialog.value = false;
    
    if (deleteTargetType.value === 'meal') {
        await mealStore.deleteMeal(deleteTargetId.value);
    } 
    else if (deleteTargetType.value === 'day') {
        const mealsToDelete = mealStore.meals.filter(m => {
            const mdObj = new Date(m.date);
            if (isNaN(mdObj.getTime())) return false;
            return getLocalISODate(mdObj) === deleteTargetId.value;
        });
        
        for (const m of mealsToDelete) {
            if (m.id) await mealStore.deleteMeal(m.id);
        }
    }
};

const handleMealClick = (meal: Meal) => {
    if (meal.recipeId && meal.id) {
        router.push(`/meals/${meal.id}`);
    }
};

</script>

<template>
    <div class="meals-agenda w-full max-w-5xl mx-auto p-4 animate-fadein pb-24">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 border-l-4 pl-3 border-primary-500">Agenda & Menu</h1>
            
            <div class="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <Button 
                    label="Générer les vides" 
                    icon="pi pi-sparkles" 
                    severity="success" 
                    @click="generateAllEmptySkeletons" 
                    :loading="isGeneratingGlobal"
                    :disabled="!hasEmptySkeletons"
                    title="Remplir automatiquement tous les repas sans recette"
                />
                <Button label="Planifier" icon="pi pi-calendar-plus" severity="primary" @click="openPlanDialog" />
            </div>
        </div>

        <!-- Loader -->
        <div v-if="!isDataReady" class="flex flex-col items-center justify-center p-12 text-surface-500">
            <ProgressSpinner strokeWidth="4" class="w-12 h-12 mb-4" />
            <p>Chargement du planning...</p>
        </div>

        <!-- Agenda Timeline -->
        <div v-else class="flex flex-col gap-8 relative">
            
            <div v-if="mealsByDate.length === 0" class="flex flex-col items-center justify-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                <i class="pi pi-calendar-times text-4xl text-surface-400 mb-3"></i>
                <h3 class="text-lg font-semibold text-surface-700 dark:text-surface-300">Aucun repas prévu</h3>
                <p class="text-surface-500 text-center mb-6">Utilisez l'assistant pour planifier vos jours puis générez vos plats !</p>
                <Button label="Planifier des repas" icon="pi pi-calendar-plus" @click="openPlanDialog" />
            </div>

            <!-- Jours -->
            <div v-for="day in mealsByDate" :key="day.dateKey" class="flex flex-col md:flex-row gap-4 relative">
                <!-- Date column -->
                <div class="md:w-32 lg:w-48 pt-2 flex flex-col md:block items-center md:items-start group">
                    <div class="sticky top-20 flex flex-col items-center md:items-start text-center md:text-left">
                        <span class="text-xl font-bold text-surface-900 dark:text-surface-100 flex items-center justify-center md:justify-start gap-2">
                            {{ day.label.split(' ')[0] }}
                            <!-- Action supprimer par jour: toujours visible mais subtile (texte neutre au lieu de danger vif) -->
                            <Button icon="pi pi-trash" class="opacity-50 hover:opacity-100" text rounded severity="secondary" size="small" @click="confirmDeleteDay(day.dateKey)" title="Vider toute la journée" style="width:2rem;height:2rem;padding:0;" />
                        </span>
                        <span class="text-sm font-medium text-surface-500 flex items-center gap-2">
                            {{ day.label.replace(day.label.split(' ')[0] + ' ', '') }}
                        </span>
                    </div>
                </div>
                
                <!-- Cards Column -->
                <div class="flex-1 flex flex-col gap-3">
                    <MealCardView 
                        v-for="meal in day.meals" 
                        :key="meal.id || meal.type+day.dateKey" 
                        :meal="meal"
                        @generate="generateSingleMeal(meal)"
                        @click="handleMealClick(meal)"
                        @delete="confirmDeleteMeal(meal)"
                        @change-status="changeMealStatus(meal, $event)"
                    />
                </div>
            </div>
            
        </div>

        <PlanMealDialog v-model:visible="showPlanDialog" />
        
        <!-- Dialog de Confirmation de Suppression -->
        <Dialog v-model:visible="showDeleteConfirmDialog" modal header="Confirmation" :style="{ width: '90vw', maxWidth: '400px' }">
            <div class="flex items-center gap-4 py-4">
                <i class="pi pi-exclamation-triangle text-red-500 text-4xl"></i>
                <p class="text-surface-700 dark:text-surface-300">
                    <span v-if="deleteTargetType === 'meal'">Êtes-vous sûr de vouloir supprimer ce repas de l'agenda ?</span>
                    <span v-else>Êtes-vous sûr de vouloir vider tous les repas de cette journée ?</span>
                </p>
            </div>
            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="showDeleteConfirmDialog = false" />
                <Button label="Supprimer" icon="pi pi-trash" severity="danger" @click="executeDelete" />
            </template>
        </Dialog>

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
