import type { Meal } from '../models/Meal';
import type { useRecipeStore } from '../stores/recipeStore';
import type { useParticipantStore } from '../stores/participantStore';
import type { useSideDishStore } from '../stores/sideDishStore';

/**
 * Hydrate un seul repas avec ses entités liées (recette, participants, sides).
 * Factorise la jointure client présente dans :
 *  - useMealsPlanningData › getHydratedMeals  (audit 2.5)
 *  - MealDetailView › hydratedMeal
 */
export const hydrateMeal = (
    meal: Meal,
    recipeStore: ReturnType<typeof useRecipeStore>,
    participantStore: ReturnType<typeof useParticipantStore>,
    sideDishStore: ReturnType<typeof useSideDishStore>
): Meal => ({
    ...meal,
    recipe: meal.recipeId
        ? recipeStore.recipes.find(r => r.id === meal.recipeId)
        : undefined,
    attendees: meal.attendeeIds
        ? participantStore.participants.filter(p => meal.attendeeIds.includes(p.id!))
        : [],
    selectedSideDishes: meal.selectedSideDishIds
        ? sideDishStore.sideDishes.filter(sd => meal.selectedSideDishIds.includes(sd.id!))
        : []
});
