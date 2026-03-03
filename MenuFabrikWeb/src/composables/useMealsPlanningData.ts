import { computed, type Ref } from 'vue';
import { MealStatus, MealTime, type Meal } from '../models/Meal';
import type { Recipe } from '../models/Recipe';
import type { useMealStore } from '../stores/mealStore';
import type { useRecipeStore } from '../stores/recipeStore';
import type { useParticipantStore } from '../stores/participantStore';
import type { useSideDishStore } from '../stores/sideDishStore';

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
    // Helper format YYYY-MM-DD en heure locale (évite les décalages UTC)
    const getLocalISODate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Priorité de tri par type quand `order` n'est pas défini
    const typeSortPriority = (type: string): number => {
        if (type === MealTime.LUNCH) return 0;
        if (type === MealTime.DINNER) return 1;
        return 2;
    };

    // Jointure côté client : recette + participants + sides
    const getHydratedMeals = computed(() => {
        return mealStore.meals.map(meal => ({
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
        } as Meal));
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

            const parts = key.split('-');
            const year = parseInt(parts[0] || '1970', 10);
            const month = parseInt(parts[1] || '1', 10) - 1;
            const day = parseInt(parts[2] || '1', 10);

            const d_date = new Date(year, month, day);
            const label = new Intl.DateTimeFormat('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            }).format(d_date);
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

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
        return recipes.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    });

    return {
        getLocalISODate,
        getHydratedMeals,
        mealsByDate,
        hasEmptySkeletons,
        pickerFilteredRecipes
    };
}
