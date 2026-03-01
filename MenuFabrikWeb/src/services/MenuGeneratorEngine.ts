import { MealStatus, type Meal } from '../models/Meal';
import { MealType, type Recipe, type RecipeCategory } from '../models/Recipe';
import type { Participant } from '../models/Participant';

export class MenuGeneratorEngine {

    /**
     * Assigne des recettes à une liste de repas
     */
    static generateMenu(meals: Meal[], availableRecipes: Recipe[], participants: Participant[]): void {
        // 3. Trier les repas chronologiquement
        const sortedMeals = [...meals].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            // Si les dates sont le même jour, on met le midi avant le soir
            if (dateA.toDateString() === dateB.toDateString()) {
                if (a.type === "Midi" && b.type === "Soir") return -1;
                if (a.type === "Soir" && b.type === "Midi") return 1;
                return 0;
            }
            return dateA.getTime() - dateB.getTime();
        });

        const usedRecipeIDs = new Set<string>();
        let previousCategory: RecipeCategory | null = null;
        let previousSideDishId: string | null = null;

        for (const meal of sortedMeals) {
            if (meal.status !== MealStatus.PLANNED) continue;
            if (meal.recipeId) continue; // Déjà assigné

            const expectedType: MealType = (meal.type === "Midi") ? MealType.LUNCH : MealType.DINNER;
            const isWeekend = this.isWeekend(new Date(meal.date));

            // 1. Extraire les IDs d'allergènes à éviter (via IDs)
            let attendees: Participant[] = [];
            if (meal.attendeeIds && meal.attendeeIds.length > 0) {
                attendees = participants.filter(p => meal.attendeeIds.includes(p.id!));
            } else {
                attendees = participants; // Fallback
            }

            const excludedAllergenIds = new Set<string>();
            attendees.forEach(p => {
                p.allergyIds.forEach(id => excludedAllergenIds.add(id));
            });

            // 2. Filtrer les recettes sûres
            const safeRecipes = availableRecipes.filter(recipe => {
                // S'assurer qu'aucun allergène de la recette n'est dans les allergènes exclus
                return !recipe.allergenIds.some(recipeAllergenId => excludedAllergenIds.has(recipeAllergenId));
            });

            const scoredCandidates: { recipe: Recipe, score: number }[] = [];

            for (const recipe of safeRecipes) {
                let score = 0;

                // --- PÉNALITÉS ---
                if (recipe.mealType !== MealType.BOTH && recipe.mealType !== expectedType) {
                    score -= 100;
                }

                if (!isWeekend && recipe.requiresFreeTime) {
                    score -= 50;
                }

                if (recipe.id && usedRecipeIDs.has(recipe.id)) {
                    score -= 80; // Déjà utilisé récemment
                }

                if (previousCategory && previousCategory === recipe.category) {
                    score -= 40; // Diversité des catégories
                }

                // --- BONUS ---
                if (meal.type === "Midi" && recipe.prepTime <= 30) {
                    score += 20;
                }

                if (isWeekend && recipe.requiresFreeTime) {
                    score += 15;
                }

                scoredCandidates.push({ recipe, score });
            }

            scoredCandidates.sort((a, b) => b.score - a.score);

            if (scoredCandidates.length === 0) {
                console.warn(`Alerte: Pas de recettes compatibles pour le repas du ${meal.date}`);
                continue;
            }

            const topScore = scoredCandidates[0]!.score;
            const bestCandidates = scoredCandidates
                .filter(c => c.score >= topScore - 10)
                .map(c => c.recipe);

            // Random element from best candidates
            const chosenRecipe = bestCandidates[Math.floor(Math.random() * bestCandidates.length)] || scoredCandidates[0]!.recipe;

            meal.recipeId = chosenRecipe.id;
            meal.recipe = chosenRecipe; // Hydratation pour l'UI immédiatement

            if (chosenRecipe.id) {
                usedRecipeIDs.add(chosenRecipe.id);
            }
            previousCategory = chosenRecipe.category;

            // Tirage au sort de l'accompagnement
            let sideIds = [...(chosenRecipe.suggestedSideIds || [])];
            if (previousSideDishId && sideIds.length > 1) {
                sideIds = sideIds.filter(id => id !== previousSideDishId);
            }

            if (sideIds.length > 0) {
                const randomSideId = sideIds[Math.floor(Math.random() * sideIds.length)];
                if (randomSideId) {
                    meal.selectedSideDishIds = [randomSideId];
                    previousSideDishId = randomSideId;
                } else {
                    meal.selectedSideDishIds = [];
                    previousSideDishId = null;
                }
            } else {
                meal.selectedSideDishIds = [];
                previousSideDishId = null;
            }
        }
    }

    /**
     * Trouve une recette alternative pour un repas unique
     */
    static generateAlternative(meal: Meal, availableRecipes: Recipe[], participants: Participant[], history: Meal[]): void {
        if (meal.status !== MealStatus.PLANNED) return;

        let attendees: Participant[] = [];
        if (meal.attendeeIds && meal.attendeeIds.length > 0) {
            attendees = participants.filter(p => meal.attendeeIds.includes(p.id!));
        } else {
            attendees = participants;
        }

        const excludedAllergenIds = new Set<string>();
        attendees.forEach(p => {
            p.allergyIds.forEach(id => excludedAllergenIds.add(id));
        });

        const safeRecipes = availableRecipes.filter(recipe => {
            return !recipe.allergenIds.some(recipeAllergenId => excludedAllergenIds.has(recipeAllergenId));
        });

        const expectedType: MealType = (meal.type === "Midi") ? MealType.LUNCH : MealType.DINNER;
        const isWeekend = this.isWeekend(new Date(meal.date));

        const usedRecipeIDs = new Set<string>();
        history.forEach(h => {
            if (h.recipeId) usedRecipeIDs.add(h.recipeId);
        });

        const currentRecipeID = meal.recipeId;

        const scoredCandidates: { recipe: Recipe, score: number }[] = [];

        for (const recipe of safeRecipes) {
            let score = 0;

            if (recipe.id === currentRecipeID) {
                continue; // Ne pas reproposer la même
            }

            if (recipe.mealType !== MealType.BOTH && recipe.mealType !== expectedType) {
                score -= 100;
            }

            if (!isWeekend && recipe.requiresFreeTime) {
                score -= 50;
            }

            if (recipe.id && usedRecipeIDs.has(recipe.id)) {
                score -= 80;
            }

            if (meal.type === "Midi" && recipe.prepTime <= 30) {
                score += 20;
            }

            if (isWeekend && recipe.requiresFreeTime) {
                score += 15;
            }

            scoredCandidates.push({ recipe, score });
        }

        scoredCandidates.sort((a, b) => b.score - a.score);

        if (scoredCandidates.length === 0) return;

        const topScore = scoredCandidates[0]!.score;
        const bestCandidates = scoredCandidates
            .filter(c => c.score >= topScore - 10)
            .map(c => c.recipe);

        const chosenRecipe = bestCandidates[Math.floor(Math.random() * bestCandidates.length)] || scoredCandidates[0]!.recipe;

        meal.recipeId = chosenRecipe.id;
        meal.recipe = chosenRecipe;

        const sideIds = chosenRecipe.suggestedSideIds || [];
        if (sideIds.length > 0) {
            const randomSide = sideIds[Math.floor(Math.random() * sideIds.length)];
            if (randomSide) {
                meal.selectedSideDishIds = [randomSide];
            } else {
                meal.selectedSideDishIds = [];
            }
        } else {
            meal.selectedSideDishIds = [];
        }
    }

    private static isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    }
}
