/**
 * Utilitaires de catégories — cf. audit 3.7.
 * Centralise le mapping `RecipeCategory → classes CSS Tailwind` (couverture complète des 8 catégories).
 */
import { RecipeCategory } from '../models/Recipe';

/**
 * Retourne les classes Tailwind de couleur correspondant à la catégorie d'une recette.
 * Couvre l'intégralité des valeurs de `RecipeCategory`.
 */
export function getCategoryColor(category?: string): string {
    switch (category) {
        case RecipeCategory.MEAT:       return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
        case RecipeCategory.FISH:       return 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300';
        case RecipeCategory.VEGETARIAN: return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
        case RecipeCategory.PASTA:      return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
        case RecipeCategory.SOUP:       return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300';
        case RecipeCategory.SALAD:      return 'bg-lime-100 dark:bg-lime-900/40 text-lime-800 dark:text-lime-300';
        case RecipeCategory.FAST_FOOD:  return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300';
        case RecipeCategory.OTHER:
        default:                        return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
    }
}
