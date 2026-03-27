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
    QUICK: "Rapide",
    OVEN: "Au Four",
    GLUTEN_FREE: "Sans Gluten",
    OTHER: "Autre"
} as const;
export type RecipeCategory = typeof RecipeCategory[keyof typeof RecipeCategory];

export interface Ingredient {
    name: string;
    quantity?: number;
    unit?: string;
    department?: string; // Optionnel : Rayon (Fruits/Légumes, Épicerie...) pour le tri futur
}

export interface Recipe {
    id?: string;
    name: string;
    prepTime: number; // en minutes
    mealType: MealType;
    categories: RecipeCategory[];

    // Listes d'IDs pour le stockage relationnel Firestore
    allergenIds: string[];
    suggestedSideIds: string[];

    // Objets hydratés pour la vue front
    allergens?: Allergen[];
    suggestedSides?: SideDish[];

    ingredients?: Ingredient[]; // Nouveau champ structuré
    instructions?: string;
    rating?: number; // De 0 à 5 étoiles
    servings?: number; // nombre de parts

    // Nouveaux champs pour l'intelligence
    requiresFreeTime: boolean;

    // Lien externe (Cookidoo, etc.)
    sourceURL?: string;

    // Lien de l'image (Firebase Storage)
    imageUrl?: string;
}
