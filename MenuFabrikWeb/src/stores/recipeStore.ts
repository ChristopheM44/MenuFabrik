import { defineStore } from 'pinia'
import type { Recipe } from '../models/Recipe'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useRecipeStore = defineStore('recipe', () => {
    const collection = useFirebaseCollection<Recipe>('recipes')

    return {
        recipes: collection.items,
        isLoading: collection.isLoading,
        error: collection.error,
        fetchRecipes: collection.fetchItems,
        ensureReady: collection.ensureReady,
        addRecipe: collection.addItem,
        updateRecipe: collection.updateItem,
        deleteRecipe: collection.deleteItem,
        setupRealtimeListener: collection.setupRealtimeListener,
        $reset: collection.$reset
    }
})
