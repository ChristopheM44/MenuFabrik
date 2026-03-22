import { computed, type Ref } from 'vue';
import { MealStatus, MealTime, type Meal } from '../models/Meal';
import type { Recipe } from '../models/Recipe';
import type { useMealStore } from '../stores/mealStore';
import type { useRecipeStore } from '../stores/recipeStore';
import type { useParticipantStore } from '../stores/participantStore';
import type { useSideDishStore } from '../stores/sideDishStore';
import { getLocalISODate, formatDateLabel } from '../utils/dateUtils';
import { hydrateMeal } from '../utils/hydrateMeal';
import { sortByNameFr } from '../utils/sortUtils';

/**
 * Composable : données calculées du planning.
 * Gère l'hydratation des repas, le groupement/tri par date,
 * et le filtrage des recettes pour le picker.
 */
export function useMealsPlanningData(
    mealStore: ReturnType<typeof useMealStore>,
    recipeStore: ReturnType<typeof useRecipeStore>,
    participantStore: ReturnType<typeof useParticipantStore>,
    sideDishStore: ReturnType<typeof useSideDishStore>,
    recipeSearchQuery?: Ref<string>
) {
    // Priorité de tri par type quand `order` n'est pas défini
    const typeSortPriority = (type: string): number => {
        if (type === MealTime.LUNCH) return 0;
        if (type === MealTime.DINNER) return 1;
        return 2;
    };

    // Jointure côté client : recette + participants + sides
    const getHydratedMeals = computed(() => {
        return mealStore.meals.map(meal => hydrateMeal(meal, recipeStore, participantStore, sideDishStore));
    });

    // Groupement + tri par date
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
                const aHasOrder = a.order !== undefined && a.order !== null;
                const bHasOrder = b.order !== undefined && b.order !== null;
                if (aHasOrder && bHasOrder) return (a.order as number) - (b.order as number);
                return typeSortPriority(a.type) - typeSortPriority(b.type);
            });
            const formattedLabel = formatDateLabel(key);

            return { dateKey: key, label: formattedLabel, meals: sortedMealsDay };
        });
    });

    // Booléen : y a-t-il des repas planifiés sans recette ?
    const hasEmptySkeletons = computed(() =>
        mealStore.meals.some(m => (!m.recipeId || m.recipeId === '') && m.status === MealStatus.PLANNED)
    );

    // Filtrage + tri des recettes pour le RecipePickerDialog
    const pickerFilteredRecipes = computed((): Recipe[] => {
        const query = recipeSearchQuery?.value?.toLowerCase() ?? '';
        let recipes = [...recipeStore.recipes];
        if (query) {
            recipes = recipes.filter(r =>
                r.name.toLowerCase().includes(query) ||
                (r.category && r.category.toLowerCase().includes(query))
            );
        }
        return sortByNameFr(recipes);
    });

    return {
        getLocalISODate,
        getHydratedMeals,
        mealsByDate,
        hasEmptySkeletons,
        pickerFilteredRecipes
    };
}
