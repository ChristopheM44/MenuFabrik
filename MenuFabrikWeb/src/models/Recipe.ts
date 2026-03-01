import type { Allergen } from './Allergen';
import type { SideDish } from './SideDish';

export const MealType = {
    LUNCH: "Midi",
    DINNER: "Soir",
    BOTH: "Les Deux"
} as const;
export type MealType = typeof MealType[keyof typeof MealType];

export const RecipeCategory = {
    PASTA: "Pâtes",
    MEAT: "Viandes",
    FISH: "Poissons",
    SOUP: "Soupes",
    SALAD: "Salades",
    FAST_FOOD: "Fast Food",
    VEGETARIAN: "Végétarien",
    OTHER: "Autre"
} as const;
export type RecipeCategory = typeof RecipeCategory[keyof typeof RecipeCategory];

export interface Recipe {
    id?: string;
    name: string;
    prepTime: number; // en minutes
    mealType: MealType;
    category: RecipeCategory;

    // Listes d'IDs pour le stockage relationnel Firestore
    allergenIds: string[];
    suggestedSideIds: string[];

    // Objets hydratés pour la vue front
    allergens?: Allergen[];
    suggestedSides?: SideDish[];

    instructions?: string;
    rating?: number; // De 0 à 5 étoiles

    // Nouveaux champs pour l'intelligence
    requiresFreeTime: boolean;

    // Lien externe (Cookidoo, etc.)
    sourceURL?: string;
}
