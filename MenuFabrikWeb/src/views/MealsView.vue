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

import { useConfirm } from 'primevue/useconfirm';

// PrimeVue
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Menu from 'primevue/menu';

const mealStore = useMealStore();
const recipeStore = useRecipeStore();
const participantStore = useParticipantStore();
const sideDishStore = useSideDishStore();
const router = useRouter();
const confirm = useConfirm();

const isDataReady = computed(() => {
    return !recipeStore.isLoading && !participantStore.isLoading && !mealStore.isLoading;
});

// Helper pour format YYYY-MM-DD local plus robuste
const getLocalISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- ÉTAT PLANIFICATION ---
const showPlanDialog = ref(false);
const isGeneratingGlobal = ref(false);

// --- ÉTAT MODIFICATION PARTICIPANTS ---
const showAttendeesDialog = ref(false);
const targetMealIdForAttendees = ref<string>('');
const selectedAttendees = ref<string[]>([]);

// --- ÉTAT CHOIX RECETTE MANUEL ---
const showRecipePicker = ref(false);
const recipeSearchQuery = ref('');
const targetMealIdForPicker = ref<string>('');

// --- ÉTAT AJOUT LIBRE ---
const addMealMenu = ref();
const selectedDateKeyForAdd = ref<string>('');

const addMealMenuItems = computed(() => [
    {
        label: 'Ajouter un repas',
        icon: 'pi pi-calendar-plus',
        actionFormat: 'standard'
    },
    {
        label: 'Ajouter une note',
        icon: 'pi pi-file-edit',
        actionFormat: 'note'
    }
].map(item => ({
    label: item.label,
    icon: item.icon,
    command: () => addNewMeal(selectedDateKeyForAdd.value, item.actionFormat as 'standard' | 'note')
})));

const toggleAddMealMenu = (event: Event, dateKey: string) => {
    selectedDateKeyForAdd.value = dateKey;
    addMealMenu.value.toggle(event);
};

const addNewMeal = async (dateKey: string, format: 'standard' | 'note') => {
    try {
        // Calcule l'order max pour cette journée afin d'insérer à la fin
        const mealsForDay = mealStore.meals.filter(m => {
            const d = new Date(m.date);
            return !isNaN(d.getTime()) && getLocalISODate(d) === dateKey;
        });
        const maxOrder = mealsForDay.reduce((max, m) => Math.max(max, m.order ?? 0), -1);

        const newMeal: Meal = {
            date: dateKey,
            type: MealTime.OTHER,
            status: MealStatus.PLANNED,
            format: format,
            noteText: '',
            attendeeIds: [],
            selectedSideDishIds: [],
            order: maxOrder + 1
        };
        await mealStore.addMeal(newMeal);
    } catch (e) {
        console.error("Erreur lors de l'ajout libre:", e);
    }
};

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

// Priorité de tri par type quand `order` n'est pas défini
const typeSortPriority = (type: string): number => {
    if (type === MealTime.LUNCH) return 0;
    if (type === MealTime.DINNER) return 1;
    return 2;
};

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
        const sortedMealsDay = [...mealsForDay].sort((a, b) => {
            // Si les deux ont un order explicite, l'utiliser
            const aHasOrder = a.order !== undefined && a.order !== null;
            const bHasOrder = b.order !== undefined && b.order !== null;
            if (aHasOrder && bHasOrder) return (a.order as number) - (b.order as number);
            // Fallback: ordre par type (Midi, Soir, puis le reste)
            return typeSortPriority(a.type) - typeSortPriority(b.type);
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

// Filtrage et tri des recettes pour le Dialog
const pickerFilteredRecipes = computed(() => {
    let recipes = [...recipeStore.recipes];
    if (recipeSearchQuery.value) {
        const query = recipeSearchQuery.value.toLowerCase();
        recipes = recipes.filter(r => 
            r.name.toLowerCase().includes(query) || 
            (r.category && r.category.toLowerCase().includes(query))
        );
    }
    return recipes.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
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

// 3.5 Choisir Manuellement
const openRecipePicker = (meal: Meal) => {
    if (!meal.id) return;
    targetMealIdForPicker.value = meal.id;
    recipeSearchQuery.value = '';
    showRecipePicker.value = true;
};

const chooseRecipeForTarget = async (recipe: any) => {
    if (!targetMealIdForPicker.value || !recipe.id) return;
    try {
        await mealStore.updateMeal(targetMealIdForPicker.value, {
            recipeId: recipe.id,
            selectedSideDishIds: []
        });
        showRecipePicker.value = false;
    } catch (e) {
        console.error("Erreur selection manuelle:", e);
    }
};

// Helper : retire les champs undefined pour éviter
// FirebaseError: "Unsupported field value: undefined"
const cleanForFirestore = (obj: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// 3.6 Permuter Midi / Soir
// Les étiquettes "Midi" / "Soir" restent fixes.
// Seul le CONTENU (recette, statut, sides) voyage d'un créneau à l'autre.
// Si aucun repas opposé n'existe → on bascule juste le type (dépl. vers l'autre créneau).
const swapMeals = async (meal: Meal, dateMeals: Meal[]) => {
    if (!meal.id) return;

    // Seulement pertinent pour Midi et Soir
    if (meal.type !== MealTime.LUNCH && meal.type !== MealTime.DINNER) return;

    const targetType = meal.type === MealTime.LUNCH ? MealTime.DINNER : MealTime.LUNCH;
    const otherMeal  = dateMeals.find(m => m.type === targetType && m.id);

    try {
        if (otherMeal && otherMeal.id) {
            // Snapshot de toutes les valeurs AVANT les appels async
            const mealId      = meal.id;
            const otherMealId = otherMeal.id;

            // Le document "Midi" garde son type "Midi" mais reçoit le contenu du "Soir"
            const meal1Updates = cleanForFirestore({
                status:              otherMeal.status || MealStatus.PLANNED,
                recipeId:            otherMeal.recipeId ?? '',
                selectedSideDishIds: otherMeal.selectedSideDishIds ?? [],
            });
            // Le document "Soir" garde son type "Soir" mais reçoit le contenu du "Midi"
            const meal2Updates = cleanForFirestore({
                status:              meal.status || MealStatus.PLANNED,
                recipeId:            meal.recipeId ?? '',
                selectedSideDishIds: meal.selectedSideDishIds ?? [],
            });

            await Promise.all([
                mealStore.updateMeal(mealId,      meal1Updates as Partial<Meal>),
                mealStore.updateMeal(otherMealId, meal2Updates as Partial<Meal>)
            ]);
        } else {
            // Pas de repas opposé → déplace le repas vers l'autre créneau
            await mealStore.updateMeal(meal.id, { type: targetType });
        }
    } catch (e) {
        console.error("Erreur de permutation:", e);
        alert("Une erreur est survenue lors de la permutation.");
    }
};

// 3.7 Déplacer vers le haut / vers le bas (via le champ order)
const moveMeal = async (meal: Meal, direction: 'up' | 'down', dateMeals: Meal[]) => {
    if (!meal.id) return;
    const idx = dateMeals.findIndex(m => m.id === meal.id);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= dateMeals.length) return;

    const neighbor = dateMeals[swapIdx];
    if (!neighbor || !neighbor.id) return;

    // Assurer que chaque repas a un order numérique
    const orderA = meal.order ?? idx;
    const orderB = neighbor.order ?? swapIdx;
    const mealId = meal.id;
    const neighborId = neighbor.id;

    try {
        await Promise.all([
            mealStore.updateMeal(mealId, { order: orderB }),
            mealStore.updateMeal(neighborId, { order: orderA })
        ]);
    } catch (e) {
        console.error('Erreur de déplacement:', e);
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
    } catch (e) {
        console.error("Erreur lors du changement de statut:", e);
    }
}

// 4.5 Mise à jour de la note text
const handleUpdateNote = async (meal: Meal, noteText: string) => {
    if (!meal.id) return;
    try {
        await mealStore.updateMeal(meal.id, { noteText });
    } catch (e) {
        console.error("Erreur lors de la mise à jour de la note:", e);
    }
};

// 5. Suppression via ConfirmDialog PrimeVue
const confirmDeleteMeal = (meal: Meal) => {
    if (!meal.id) return;
    
    confirm.require({
        message: "Êtes-vous sûr de vouloir supprimer ce repas de l'agenda ?",
        header: 'Confirmation de suppression',
        icon: 'pi pi-exclamation-triangle text-red-500',
        rejectProps: {
            label: 'Annuler',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Supprimer',
            severity: 'danger'
        },
        accept: async () => {
            if (meal.id) await mealStore.deleteMeal(meal.id);
        }
    });
};

const confirmDeleteDay = (dateKey: string) => {
    confirm.require({
        message: "Êtes-vous sûr de vouloir vider tous les repas de cette journée ?",
        header: 'Vider la journée',
        icon: 'pi pi-exclamation-triangle text-red-500',
        rejectProps: {
            label: 'Annuler',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Vider',
            severity: 'danger'
        },
        accept: async () => {
            const mealsToDelete = mealStore.meals.filter(m => {
                const mdObj = new Date(m.date);
                if (isNaN(mdObj.getTime())) return false;
                return getLocalISODate(mdObj) === dateKey;
            });
            
            for (const m of mealsToDelete) {
                if (m.id) await mealStore.deleteMeal(m.id);
            }
        }
    });
};

const handleMealClick = (meal: Meal) => {
    if (meal.recipeId && meal.id) {
        router.push(`/meals/${meal.id}`);
    }
};

// 6. Modification Participants
const openAttendeesDialog = (meal: Meal) => {
    if (!meal.id) return;
    targetMealIdForAttendees.value = meal.id;
    selectedAttendees.value = [...(meal.attendeeIds || [])];
    showAttendeesDialog.value = true;
};

const saveAttendees = async () => {
    if (!targetMealIdForAttendees.value) return;
    try {
        await mealStore.updateMeal(targetMealIdForAttendees.value, {
            attendeeIds: selectedAttendees.value
        });
        showAttendeesDialog.value = false;
    } catch (e) {
        console.error("Erreur lors de la modification des participants:", e);
    }
};

</script>

<template>
    <div class="meals-agenda w-full max-w-5xl mx-auto p-4 animate-fadein pb-8">
        
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
                            
                            <div class="flex items-center">
                                <!-- Bouton Ajouter libre -->
                                <Button 
                                    icon="pi pi-plus" 
                                    text 
                                    rounded 
                                    severity="primary" 
                                    size="small" 
                                    class="w-8 h-8 p-0"
                                    @click="toggleAddMealMenu($event, day.dateKey)"
                                    title="Ajouter un repas ou une note"
                                />
                                <!-- Action supprimer par jour -->
                                <Button 
                                    icon="pi pi-trash" 
                                    class="opacity-50 hover:opacity-100" 
                                    text 
                                    rounded 
                                    severity="secondary" 
                                    size="small" 
                                    @click="confirmDeleteDay(day.dateKey)" 
                                    title="Vider toute la journée" 
                                    style="width:2rem;height:2rem;padding:0;" 
                                />
                            </div>
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
                        :is-first="meal.id === day.meals[0]?.id"
                        :is-last="meal.id === day.meals[day.meals.length - 1]?.id"
                        @generate="generateSingleMeal(meal)"
                        @choose-recipe="openRecipePicker(meal)"
                        @swap="swapMeals(meal, day.meals)"
                        @click="handleMealClick(meal)"
                        @delete="confirmDeleteMeal(meal)"
                        @change-status="changeMealStatus(meal, $event)"
                        @edit-attendees="openAttendeesDialog(meal)"
                        @update-note="handleUpdateNote(meal, $event)"
                        @move-up="moveMeal(meal, 'up', day.meals)"
                        @move-down="moveMeal(meal, 'down', day.meals)"
                    />
                </div>
            </div>
            
        </div>

        <Menu ref="addMealMenu" :model="addMealMenuItems" :popup="true" />
        <PlanMealDialog v-model:visible="showPlanDialog" />
        
        <!-- EDIT ATTENDEES MODAL -->
        <Dialog v-model:visible="showAttendeesDialog" modal header="Modifier les participants" :style="{ width: '90vw', maxWidth: '400px' }">
            <div class="flex flex-col gap-4 py-4 pt-2">
                <p class="text-surface-600 dark:text-surface-400 text-sm mb-2">
                    Sélectionnez les personnes présentes pour ce repas.
                </p>
                <div class="flex flex-col gap-2">
                    <label class="font-semibold text-sm">Participants</label>
                    <MultiSelect 
                        v-model="selectedAttendees" 
                        :options="participantStore.participants" 
                        optionLabel="name" 
                        optionValue="id"
                        placeholder="Sélectionner les convives"
                        class="w-full" 
                        display="chip"
                    />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text severity="secondary" @click="showAttendeesDialog = false" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveAttendees" />
            </template>
        </Dialog>

        <!-- RECIPE PICKER MODAL -->
        <Dialog v-model:visible="showRecipePicker" modal header="Choisir une recette" :style="{ width: '90vw', maxWidth: '600px' }">
            <div class="flex flex-col gap-4 py-2 h-[60vh]">
                <span class="p-input-icon-left w-full">
                    <i class="pi pi-search z-10" />
                    <InputText v-model="recipeSearchQuery" placeholder="Rechercher un plat..." class="w-full" />
                </span>
                <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                    <div 
                        v-for="recipe in pickerFilteredRecipes" 
                        :key="recipe.id"
                        class="p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors flex items-center justify-between group"
                        @click="chooseRecipeForTarget(recipe)"
                    >
                        <div class="flex flex-col">
                            <span class="font-bold text-surface-900 dark:text-surface-0 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                                {{ recipe.name }}
                            </span>
                            <div class="flex items-center gap-2 text-xs text-surface-500 mt-1">
                                <span v-if="recipe.rating && recipe.rating > 0" class="text-primary-500 flex items-center gap-1">
                                    <i class="pi pi-star-fill text-[10px]"></i> {{ recipe.rating }}
                                </span>
                                <span><i class="pi pi-clock text-[10px]"></i> {{ recipe.prepTime }} min</span>
                                <span><i class="pi pi-tag"></i> {{ recipe.category }}</span>
                            </div>
                        </div>
                        <Button icon="pi pi-chevron-right" severity="secondary" text rounded />
                    </div>
                    
                    <div v-if="pickerFilteredRecipes.length === 0" class="text-center p-8 text-surface-500">
                        Aucune recette trouvée.
                    </div>
                </div>
            </div>
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
