import { defineStore } from 'pinia'
import type { Allergen } from '../models/Allergen'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useAllergenStore = defineStore('allergen', () => {
    const collection = useFirebaseCollection<Allergen>('allergens')

    return {
        allergens: collection.items,
        isLoading: collection.isLoading,
        error: collection.error,
        fetchAllergens: collection.fetchItems,
        ensureReady: collection.ensureReady,
        addAllergen: collection.addItem,
        updateAllergen: collection.updateItem,
        deleteAllergen: collection.deleteItem,
        setupRealtimeListener: collection.setupRealtimeListener,
        $reset: collection.$reset
    }
})
