import { defineStore } from 'pinia'
import type { SideDish } from '../models/SideDish'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useSideDishStore = defineStore('sideDish', () => {
    const collection = useFirebaseCollection<SideDish>('sideDishes')

    return {
        sideDishes: collection.items,
        isLoading: collection.isLoading,
        error: collection.error,
        fetchSideDishes: collection.fetchItems,
        addSideDish: collection.addItem,
        updateSideDish: collection.updateItem,
        deleteSideDish: collection.deleteItem,
        setupRealtimeListener: collection.setupRealtimeListener,
        $reset: collection.$reset
    }
})
