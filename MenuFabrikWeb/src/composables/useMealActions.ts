import { ref } from 'vue';
import { MealStatus, MealTime, type Meal } from '../models/Meal';
import type { Recipe } from '../models/Recipe';
import { MenuGeneratorEngine } from '../services/MenuGeneratorEngine';
import { useRouter } from 'vue-router';
import { useAppConfirm } from './useAppConfirm';
import { useNotify } from './useNotify';
import { cleanForFirestore } from '../utils/mealUtils';
import type { useMealStore } from '../stores/mealStore';
import type { useRecipeStore } from '../stores/recipeStore';
import type { useParticipantStore } from '../stores/participantStore';

/**
 * Composable : toutes les actions métier du module Agenda & Menu.
 * Gère : génération IA, swap Midi/Soir, déplacement, statut,
 * suppression (useConfirm), participants, recette manuelle, navigation.
 */
export function useMealActions(
    mealStore: ReturnType<typeof useMealStore>,
    recipeStore: ReturnType<typeof useRecipeStore>,
    participantStore: ReturnType<typeof useParticipantStore>,
    getLocalISODate: (date: Date) => string
) {
    const router = useRouter();
    const { confirm } = useAppConfirm();
    const { notifyError } = useNotify();

    // --- État UI partagé avec les dialogs ---
    const isGeneratingGlobal = ref(false);
    const showAttendeesDialog = ref(false);
    const targetMealIdForAttendees = ref<string>('');
    const showRecipePicker = ref(false);
    const targetMealIdForPicker = ref<string>('');

    // 1. Ajout libre (repas standard ou note)
    const addNewMeal = async (dateKey: string, format: 'standard' | 'note') => {
        try {
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
        } catch (e: any) {
            console.error("Erreur lors de l'ajout libre:", e);
            notifyError("Impossible d'ajouter le repas", e?.message);
        }
    };

    // 2. Génération IA globale (tous les skeletons vides)
    const generateAllEmptySkeletons = async (hasEmptySkeletons: boolean) => {
        if (!hasEmptySkeletons) return;

        isGeneratingGlobal.value = true;
        try {
            const emptyMeals = mealStore.meals
                .filter(m => (!m.recipeId || m.recipeId === '') && m.status === MealStatus.PLANNED)
                .map(m => ({ ...m }));

            if (emptyMeals.length > 0) {
                MenuGeneratorEngine.generateMenu(
                    emptyMeals,
                    recipeStore.recipes,
                    participantStore.participants
                );
                await mealStore.saveMealsBatch(emptyMeals);
            }
        } catch (e: any) {
            console.error("Erreur Génération globale:", e);
            notifyError('Erreur de génération', 'Une erreur est survenue lors de la génération automatique.');
        } finally {
            isGeneratingGlobal.value = false;
        }
    };

    // 3. Génération IA unitaire (ou alternative si recette déjà assignée)
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
        } catch (e: any) {
            console.error("Erreur lors de la génération ciblée:", e);
            notifyError('Erreur de génération', e?.message);
        }
    };

    // 3.5 Ouvrir le RecipePickerDialog
    const openRecipePicker = (meal: Meal) => {
        if (!meal.id) return;
        targetMealIdForPicker.value = meal.id;
        showRecipePicker.value = true;
    };

    // 3.5b Sauvegarder la recette choisie manuellement
    const chooseRecipeForTarget = async (recipe: Recipe) => {
        if (!targetMealIdForPicker.value || !recipe.id) return;
        try {
            await mealStore.updateMeal(targetMealIdForPicker.value, {
                recipeId: recipe.id,
                selectedSideDishIds: []
            });
            showRecipePicker.value = false;
        } catch (e: any) {
            console.error("Erreur selection manuelle:", e);
            notifyError('Impossible de choisir la recette', e?.message);
        }
    };

    // 3.6 Permuter Midi ↔ Soir
    // Les étiquettes "Midi"/"Soir" restent fixes en base.
    // Seul le CONTENU (status, recipeId, selectedSideDishIds) voyage.
    // Si pas de repas opposé → bascule le type.
    const swapMeals = async (meal: Meal, dateMeals: Meal[]) => {
        if (!meal.id) return;
        if (meal.type !== MealTime.LUNCH && meal.type !== MealTime.DINNER) return;

        const targetType = meal.type === MealTime.LUNCH ? MealTime.DINNER : MealTime.LUNCH;
        const otherMeal = dateMeals.find(m => m.type === targetType && m.id);

        try {
            if (otherMeal && otherMeal.id) {
                // Snapshot AVANT les appels async (le realtime listener peut modifier le store entre-temps)
                const mealId = meal.id;
                const otherMealId = otherMeal.id;

                // Le document "Midi" garde son type "Midi" mais reçoit le contenu du "Soir"
                const meal1Updates = cleanForFirestore({
                    status: otherMeal.status || MealStatus.PLANNED,
                    recipeId: otherMeal.recipeId ?? '',
                    selectedSideDishIds: otherMeal.selectedSideDishIds ?? [],
                });
                // Le document "Soir" garde son type "Soir" mais reçoit le contenu du "Midi"
                const meal2Updates = cleanForFirestore({
                    status: meal.status || MealStatus.PLANNED,
                    recipeId: meal.recipeId ?? '',
                    selectedSideDishIds: meal.selectedSideDishIds ?? [],
                });

                await Promise.all([
                    mealStore.updateMeal(mealId, meal1Updates as Partial<Meal>),
                    mealStore.updateMeal(otherMealId, meal2Updates as Partial<Meal>)
                ]);
            } else {
                // Pas de repas opposé → déplace le repas vers l'autre créneau
                await mealStore.updateMeal(meal.id, { type: targetType });
            }
        } catch (e: any) {
            console.error("Erreur de permutation:", e);
            notifyError('Impossible de permuter', e?.message);
        }
    };

    // 3.7 Déplacer haut/bas (champ order)
    const moveMeal = async (meal: Meal, direction: 'up' | 'down', dateMeals: Meal[]) => {
        if (!meal.id) return;
        const idx = dateMeals.findIndex(m => m.id === meal.id);
        if (idx === -1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= dateMeals.length) return;

        const neighbor = dateMeals[swapIdx];
        if (!neighbor || !neighbor.id) return;

        // Snapshot AVANT await
        const orderA = meal.order ?? idx;
        const orderB = neighbor.order ?? swapIdx;
        const mealId = meal.id;
        const neighborId = neighbor.id;

        try {
            await Promise.all([
                mealStore.updateMeal(mealId, { order: orderB }),
                mealStore.updateMeal(neighborId, { order: orderA })
            ]);
        } catch (e: any) {
            console.error('Erreur de déplacement:', e);
            notifyError('Impossible de déplacer le repas', e?.message);
        }
    };

    // 4. Changement de statut
    const changeMealStatus = async (meal: Meal, newStatus: MealStatus) => {
        if (!meal.id) return;
        try {
            const updateData: Partial<Meal> = { status: newStatus };
            if (newStatus !== MealStatus.PLANNED) {
                updateData.recipeId = '';
                updateData.selectedSideDishIds = [];
            }
            await mealStore.updateMeal(meal.id, updateData);
        } catch (e: any) {
            console.error("Erreur lors du changement de statut:", e);
            notifyError('Impossible de changer le statut', e?.message);
        }
    };

    // 4.5 Mise à jour du texte d'une note libre
    const handleUpdateNote = async (meal: Meal, noteText: string) => {
        if (!meal.id) return;
        try {
            await mealStore.updateMeal(meal.id, { noteText });
        } catch (e: any) {
            console.error("Erreur lors de la mise à jour de la note:", e);
            notifyError('Impossible de sauvegarder la note', e?.message);
        }
    };

    // 5. Suppression unitaire via useConfirm PrimeVue
    const confirmDeleteMeal = (meal: Meal) => {
        if (!meal.id) return;
        confirm({
            title: 'Supprimer ce repas',
            message: "Êtes-vous sûr de vouloir supprimer ce repas de l'agenda ?",
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            onAccept: async () => {
                try {
                    if (meal.id) await mealStore.deleteMeal(meal.id);
                } catch (e: any) {
                    console.error("Erreur lors de la suppression du repas:", e);
                    notifyError('Impossible de supprimer le repas', e?.message);
                }
            }
        });
    };

    // 5.5 Suppression de toute la journée via useConfirm PrimeVue
    const confirmDeleteDay = (dateKey: string) => {
        confirm({
            title: 'Vider la journée',
            message: "Êtes-vous sûr de vouloir vider tous les repas de cette journée ?",
            acceptLabel: 'Vider',
            rejectLabel: 'Annuler',
            onAccept: async () => {
                try {
                    const mealsToDelete = mealStore.meals.filter(m => {
                        const mdObj = new Date(m.date);
                        if (isNaN(mdObj.getTime())) return false;
                        return getLocalISODate(mdObj) === dateKey;
                    });
                    for (const m of mealsToDelete) {
                        if (m.id) await mealStore.deleteMeal(m.id);
                    }
                } catch (e: any) {
                    console.error("Erreur lors de la suppression de la journée:", e);
                    notifyError('Impossible de vider la journée', e?.message);
                }
            }
        });
    };

    // 6. Navigation vers le détail d'un repas
    const handleMealClick = (meal: Meal) => {
        if (meal.recipeId && meal.id) {
            router.push(`/meals/${meal.id}`);
        }
    };

    // 7. Ouvrir le dialog participants
    const openAttendeesDialog = (meal: Meal) => {
        if (!meal.id) return;
        targetMealIdForAttendees.value = meal.id;
        showAttendeesDialog.value = true;
    };

    // 7.5 Sauvegarder les participants (attendeeIds émis par le dialog)
    const saveAttendees = async (attendeeIds: string[]) => {
        if (!targetMealIdForAttendees.value) return;
        try {
            await mealStore.updateMeal(targetMealIdForAttendees.value, { attendeeIds });
            showAttendeesDialog.value = false;
        } catch (e: any) {
            console.error("Erreur lors de la modification des participants:", e);
            notifyError('Impossible de sauvegarder les participants', e?.message);
        }
    };

    return {
        // État UI
        isGeneratingGlobal,
        showAttendeesDialog,
        targetMealIdForAttendees,
        showRecipePicker,
        targetMealIdForPicker,
        // Actions
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
    };
}
