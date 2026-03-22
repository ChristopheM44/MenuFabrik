<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMealStore } from '../stores/mealStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useParticipantStore } from '../stores/participantStore';
import { useSideDishStore } from '../stores/sideDishStore';
import { useMealsPlanningData } from '../composables/useMealsPlanningData';
import { useMealActions } from '../composables/useMealActions';
import MealCardView from '../components/MealCardView.vue';
import PlanMealDialog from '../components/planning/PlanMealDialog.vue';
import AttendeePickerDialog from '../components/planning/AttendeePickerDialog.vue';
import RecipePickerDialog from '../components/planning/RecipePickerDialog.vue';
import type { Meal } from '../models/Meal';

// PrimeVue
import ProgressSpinner from 'primevue/progressspinner';
import Menu from 'primevue/menu';

// --- Stores ---
const mealStore = useMealStore();
const recipeStore = useRecipeStore();
const participantStore = useParticipantStore();
const sideDishStore = useSideDishStore();

// --- Données calculées ---
const { getLocalISODate, mealsByDate, hasEmptySkeletons } =
    useMealsPlanningData(mealStore, recipeStore, participantStore, sideDishStore);

// --- Actions métier ---
const {
    isGeneratingGlobal,
    showAttendeesDialog,
    targetMealIdForAttendees,
    showRecipePicker,
    addNewMeal,
    generateAllEmptySkeletons,
    generateSingleMeal,
    openRecipePicker,
    chooseRecipeForTarget,
    swapMeals,
    moveMeal,
    changeMealStatus,
    handleUpdateNote,
    confirmDeleteMeal,
    confirmDeleteDay,
    handleMealClick,
    openAttendeesDialog,
    saveAttendees
} = useMealActions(mealStore, recipeStore, participantStore, getLocalISODate);

// --- État UI local ---
const showPlanDialog = ref(false);
const addMealMenu = ref();
const selectedDateKeyForAdd = ref<string>('');

// Repas cible pour le dialog participants (pour le watch dans AttendeePickerDialog)
const targetMealForAttendees = computed((): Meal | null => {
    if (!targetMealIdForAttendees.value) return null;
    return mealStore.meals.find(m => m.id === targetMealIdForAttendees.value) ?? null;
});

const isDataReady = computed(() =>
    !recipeStore.isLoading && !participantStore.isLoading && !mealStore.isLoading
);

// --- Menu "Ajouter" ---
const addMealMenuItems = computed(() => [
    {
        label: 'Ajouter un repas',
        icon: 'pi pi-calendar-plus',
        command: () => addNewMeal(selectedDateKeyForAdd.value, 'standard')
    },
    {
        label: 'Ajouter une note',
        icon: 'pi pi-file-edit',
        command: () => addNewMeal(selectedDateKeyForAdd.value, 'note')
    }
]);

const toggleAddMealMenu = (event: Event, dateKey: string) => {
    selectedDateKeyForAdd.value = dateKey;
    addMealMenu.value.toggle(event);
};

// --- Init ---
onMounted(async () => {
    if (recipeStore.recipes.length === 0) await recipeStore.fetchRecipes();
    if (participantStore.participants.length === 0) await participantStore.fetchParticipants();
    if (sideDishStore.sideDishes.length === 0) await sideDishStore.fetchSideDishes();
    if (mealStore.meals.length === 0) mealStore.setupRealtimeListener();
});
</script>

<template>
    <div class="w-full max-w-6xl mx-auto p-4 md:p-6 pb-32 min-h-screen animate-fadein">

        <!-- Header -->
        <section class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
                <div class="flex items-center gap-2 mb-2 text-primary-500 dark:text-primary-400">
                    <i class="pi pi-calendar"></i>
                    <span class="text-sm font-bold tracking-[0.1em] uppercase">Planning</span>
                </div>
                <h1 class="text-4xl md:text-5xl font-extrabold tracking-tighter text-surface-900 dark:text-surface-0">Agenda & Menu</h1>
            </div>
            <div class="flex items-center gap-3">
                <button @click="showPlanDialog = true" class="px-6 h-12 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-0 font-bold text-sm hover:bg-surface-300 dark:hover:bg-surface-600 transition-all active:scale-95 flex items-center gap-2">
                    <i class="pi pi-sliders-h text-lg"></i>
                    Planifier
                </button>
                <button @click="generateAllEmptySkeletons(hasEmptySkeletons)" :disabled="!hasEmptySkeletons || isGeneratingGlobal" class="px-6 h-12 rounded-full bg-primary-600 dark:bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-700 dark:hover:bg-primary-600 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <i v-if="isGeneratingGlobal" class="pi pi-spin pi-spinner text-lg"></i>
                    <i v-else class="pi pi-sparkles text-lg"></i>
                    Générer les vides
                </button>
            </div>
        </section>

        <!-- Loader -->
        <div v-if="!isDataReady" class="flex flex-col items-center justify-center p-12 text-surface-500 dark:text-surface-400">
            <ProgressSpinner strokeWidth="4" class="w-12 h-12 mb-4" />
            <p>Chargement du planning...</p>
        </div>

        <!-- Agenda Timeline -->
        <div v-else class="space-y-12 relative">

            <div v-if="mealsByDate.length === 0" class="flex flex-col items-center justify-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                <i class="pi pi-calendar-times text-4xl text-surface-400 dark:text-surface-500 mb-3"></i>
                <h3 class="text-lg font-semibold text-surface-700 dark:text-surface-300">Aucun repas prévu</h3>
                <p class="text-surface-500 dark:text-surface-400 text-center mb-6">Utilisez l'assistant pour planifier vos jours puis générez vos plats !</p>
                <button @click="showPlanDialog = true" class="px-6 h-12 rounded-full bg-primary-600 text-white font-bold text-sm shadow-lg hover:bg-primary-700 transition-all flex items-center gap-2">
                    <i class="pi pi-calendar-plus"></i> Planifier des repas
                </button>
            </div>

            <!-- Jours -->
            <div v-for="day in mealsByDate" :key="day.dateKey" class="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-8 group">
                <!-- Sticky Sidebar -->
                <aside class="md:sticky md:top-24 h-fit flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-4 border-b border-surface-200 dark:border-surface-700 md:border-none pb-3 md:pb-0">
                    <div class="flex flex-row md:flex-col items-baseline md:items-start gap-2 md:gap-0">
                        <span class="text-2xl md:text-4xl font-extrabold text-surface-900 dark:text-surface-0 md:group-hover:text-primary-500 transition-colors">{{ day.label.split(' ')[0] }}</span>
                        <span class="text-surface-500 dark:text-surface-400 font-bold tracking-widest uppercase text-xs md:text-sm md:mt-1">
                            {{ day.label.replace(day.label.split(' ')[0] + ' ', '') }}
                        </span>
                    </div>
                    <!-- Actions -->
                    <div class="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click="toggleAddMealMenu($event, day.dateKey)" class="w-8 h-8 md:w-10 md:h-10 rounded-full border border-surface-300 dark:border-surface-600 flex items-center justify-center hover:bg-primary-500 hover:text-white transition-all text-surface-500 dark:text-surface-400 bg-surface-50 md:bg-transparent dark:bg-surface-800">
                            <i class="pi pi-plus text-sm md:text-lg"></i>
                        </button>
                        <button @click="confirmDeleteDay(day.dateKey)" class="w-8 h-8 md:w-10 md:h-10 rounded-full border border-surface-300 dark:border-surface-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-surface-500 dark:text-surface-400 bg-surface-50 md:bg-transparent dark:bg-surface-800">
                            <i class="pi pi-trash text-sm md:text-lg"></i>
                        </button>
                    </div>
                </aside>

                <!-- Cards Column -->
                <div class="space-y-4">
                    <MealCardView v-for="meal in day.meals" :key="meal.id || meal.type + day.dateKey" :meal="meal"
                        :is-first="meal.id === day.meals[0]?.id"
                        :is-last="meal.id === day.meals[day.meals.length - 1]?.id" @generate="generateSingleMeal(meal)"
                        @choose-recipe="openRecipePicker(meal)" @swap="swapMeals(meal, day.meals)"
                        @click="handleMealClick(meal)" @delete="confirmDeleteMeal(meal)"
                        @change-status="changeMealStatus(meal, $event)" @edit-attendees="openAttendeesDialog(meal)"
                        @update-note="handleUpdateNote(meal, $event)" @move-up="moveMeal(meal, 'up', day.meals)"
                        @move-down="moveMeal(meal, 'down', day.meals)" />
                </div>
            </div>
        </div>

        <Menu ref="addMealMenu" :model="addMealMenuItems" :popup="true" />
        <PlanMealDialog v-model:visible="showPlanDialog" />

        <!-- Dialog : Participants -->
        <AttendeePickerDialog v-model:visible="showAttendeesDialog" :meal="targetMealForAttendees" @saved="saveAttendees" />

        <!-- Dialog : Recette -->
        <RecipePickerDialog v-model:visible="showRecipePicker" :recipes="recipeStore.recipes" @recipe-selected="chooseRecipeForTarget($event)" />

    </div>
</template>

<style scoped>
</style>
