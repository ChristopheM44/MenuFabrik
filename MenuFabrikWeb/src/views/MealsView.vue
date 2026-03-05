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
import Button from 'primevue/button';
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
    <div class="meals-agenda w-full max-w-5xl mx-auto p-4 animate-fadein pb-8">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-2">
            <div>
                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 flex items-center gap-3">
                    <i class="pi pi-calendar text-primary-500"></i>
                    Agenda & Menu
                </h1>
                <p class="text-surface-500 dark:text-surface-400 mt-2">Planifiez, générez et ajustez vos repas au
                    quotidien.</p>
            </div>

            <div class="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <Button label="Générer les vides" icon="pi pi-sparkles" severity="success"
                    @click="generateAllEmptySkeletons(hasEmptySkeletons)" :loading="isGeneratingGlobal"
                    :disabled="!hasEmptySkeletons" title="Remplir automatiquement tous les repas sans recette" />
                <Button label="Planifier" icon="pi pi-calendar-plus" severity="primary"
                    @click="showPlanDialog = true" />
            </div>
        </div>

        <!-- Loader -->
        <div v-if="!isDataReady"
            class="flex flex-col items-center justify-center p-12 text-surface-500 dark:text-surface-400">
            <ProgressSpinner strokeWidth="4" class="w-12 h-12 mb-4" />
            <p>Chargement du planning...</p>
        </div>

        <!-- Agenda Timeline -->
        <div v-else class="flex flex-col gap-8 relative">

            <div v-if="mealsByDate.length === 0"
                class="flex flex-col items-center justify-center p-12 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                <i class="pi pi-calendar-times text-4xl text-surface-400 dark:text-surface-500 mb-3"></i>
                <h3 class="text-lg font-semibold text-surface-700 dark:text-surface-300">Aucun repas prévu</h3>
                <p class="text-surface-500 dark:text-surface-400 text-center mb-6">Utilisez l'assistant pour planifier
                    vos jours puis générez vos plats !</p>
                <Button label="Planifier des repas" icon="pi pi-calendar-plus" @click="showPlanDialog = true" />
            </div>

            <!-- Jours -->
            <div v-for="day in mealsByDate" :key="day.dateKey" class="flex flex-col md:flex-row gap-4 relative">
                <!-- Date column -->
                <div class="md:w-32 lg:w-48 pt-2 flex flex-col md:block items-center md:items-start group">
                    <div class="sticky top-20 flex flex-col items-center md:items-start text-center md:text-left">
                        <span
                            class="text-xl font-bold text-surface-900 dark:text-surface-100 flex items-center justify-center md:justify-start gap-2">
                            {{ day.label.split(' ')[0] }}
                            <div class="flex items-center">
                                <Button icon="pi pi-plus" text rounded severity="primary" size="small"
                                    class="w-8 h-8 p-0" @click="toggleAddMealMenu($event, day.dateKey)"
                                    title="Ajouter un repas ou une note" />
                                <Button icon="pi pi-trash" class="opacity-50 hover:opacity-100" text rounded
                                    severity="secondary" size="small" @click="confirmDeleteDay(day.dateKey)"
                                    title="Vider toute la journée" style="width:2rem;height:2rem;padding:0;" />
                            </div>
                        </span>
                        <span
                            class="text-sm font-medium text-surface-500 dark:text-surface-400 flex items-center gap-2">
                            {{ day.label.replace(day.label.split(' ')[0] + ' ', '') }}
                        </span>
                    </div>
                </div>

                <!-- Cards Column -->
                <div class="flex-1 flex flex-col gap-3">
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
        <AttendeePickerDialog v-model:visible="showAttendeesDialog" :meal="targetMealForAttendees"
            @saved="saveAttendees" />

        <!-- Dialog : Recette -->
        <RecipePickerDialog v-model:visible="showRecipePicker" :recipes="recipeStore.recipes"
            @recipe-selected="chooseRecipeForTarget($event)" />

    </div>
</template>

<style scoped>
.animate-fadein {
    animation: fadein 0.3s ease-out forwards;
}

@keyframes fadein {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
