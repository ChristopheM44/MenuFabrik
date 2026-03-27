import { MealStatus, MealTime, type Meal } from '../models/Meal';
import { MealType, type Recipe, type RecipeCategory } from '../models/Recipe';
import type { Participant } from '../models/Participant';

export class MenuGeneratorEngine {

    /**
     * Assigne des recettes à une liste de repas
     */
    static generateMenu(meals: Meal[], availableRecipes: Recipe[], participants: Participant[]): void {
        const sortedMeals = [...meals].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            if (dateA.toDateString() === dateB.toDateString()) {
                if (a.type === MealTime.LUNCH && b.type === MealTime.DINNER) return -1;
                if (a.type === MealTime.DINNER && b.type === MealTime.LUNCH) return 1;
                return 0;
            }
            return dateA.getTime() - dateB.getTime();
        });

        const usedRecipeIDs = new Set<string>();
        let previousCategories: RecipeCategory[] = [];
        let previousSideDishId: string | null = null;

        for (const meal of sortedMeals) {
            if (meal.format === 'note') continue;
            if (meal.status !== MealStatus.PLANNED) continue;
            if (meal.recipeId) continue;

            const safeRecipes = this.getSafeRecipes(meal, availableRecipes, participants);
            const scoredCandidates = this.scoreCandidates(
                meal,
                safeRecipes,
                usedRecipeIDs,
                previousCategories
            );

            if (scoredCandidates.length === 0) {
                console.warn(`Alerte: Pas de recettes compatibles pour le repas du ${meal.date}`);
                continue;
            }

            const chosenRecipe = this.pickBestCandidate(scoredCandidates);

            meal.recipeId = chosenRecipe.id;
            meal.recipe = chosenRecipe;

            if (chosenRecipe.id) {
                usedRecipeIDs.add(chosenRecipe.id);
            }
            previousCategories = chosenRecipe.categories;

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
        if (meal.format === 'note') return;
        if (meal.status !== MealStatus.PLANNED) return;

        const safeRecipes = this.getSafeRecipes(meal, availableRecipes, participants);

        const usedRecipeIDs = new Set<string>();
        history.forEach(h => {
            if (h.recipeId) usedRecipeIDs.add(h.recipeId);
        });

        const currentRecipeID = meal.recipeId;

        // Exclure la recette actuelle des candidats
        const candidates = safeRecipes.filter(r => r.id !== currentRecipeID);

        const scoredCandidates = this.scoreCandidates(
            meal,
            candidates,
            usedRecipeIDs,
            []
        );

        if (scoredCandidates.length === 0) return;

        const chosenRecipe = this.pickBestCandidate(scoredCandidates);

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

    // --- Private DRY Helpers ---

    private static getSafeRecipes(meal: Meal, availableRecipes: Recipe[], participants: Participant[]): Recipe[] {
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

        return availableRecipes.filter(recipe => {
            return !recipe.allergenIds.some(recipeAllergenId => excludedAllergenIds.has(recipeAllergenId));
        });
    }

    private static scoreCandidates(
        meal: Meal,
        recipes: Recipe[],
        usedRecipeIDs: Set<string>,
        previousCategories: RecipeCategory[]
    ): { recipe: Recipe, score: number }[] {
        const expectedType: MealType = (meal.type === MealTime.LUNCH) ? MealType.LUNCH : MealType.DINNER;
        const isWeekend = this.isWeekend(new Date(meal.date));

        const scoredCandidates: { recipe: Recipe, score: number }[] = [];

        for (const recipe of recipes) {
            let score = 0;

            if (recipe.mealType !== MealType.BOTH && recipe.mealType !== expectedType) {
                score -= 100;
            }

            if (!isWeekend && recipe.requiresFreeTime) {
                score -= 50;
            }

            if (recipe.id && usedRecipeIDs.has(recipe.id)) {
                score -= 80;
            }

            if (previousCategories.length > 0 && recipe.categories.some(c => previousCategories.includes(c))) {
                score -= 40;
            }

            if (meal.type === MealTime.LUNCH && recipe.prepTime <= 30) {
                score += 20;
            }

            if (isWeekend && recipe.requiresFreeTime) {
                score += 15;
            }

            scoredCandidates.push({ recipe, score });
        }

        return scoredCandidates.sort((a, b) => b.score - a.score);
    }

    private static pickBestCandidate(scoredCandidates: { recipe: Recipe, score: number }[]): Recipe {
        const topScore = scoredCandidates[0]!.score;
        const bestCandidates = scoredCandidates
            .filter(c => c.score >= topScore - 10)
            .map(c => c.recipe);

        return bestCandidates[Math.floor(Math.random() * bestCandidates.length)] || scoredCandidates[0]!.recipe;
    }

    private static isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6;
    }
}
