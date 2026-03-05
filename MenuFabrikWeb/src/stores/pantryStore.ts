import { defineStore } from 'pinia'
import { writeBatch, collection, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { PantryItem } from '../models/PantryItem'
import type { ShoppingItem } from '../models/ShoppingItem'
import { useAuthStore } from './authStore'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const usePantryStore = defineStore('pantry', () => {
    const firestoreCollection = useFirebaseCollection<PantryItem>('pantryItems')
    const authStore = useAuthStore()

    const transferSelectedToShoppingList = async () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        try {
            const batch = writeBatch(db)
            const pantryCollectionRef = collection(db, 'users', authStore.user.uid, 'pantryItems')
            const shoppingCollectionRef = collection(db, 'users', authStore.user.uid, 'shoppingItems')

            const selectedItems = firestoreCollection.items.value.filter(i => i.selected)

            if (selectedItems.length === 0) return 0;

            for (const item of selectedItems) {
                if (item.id) {
                    // 1. Create ShoppingItem
                    const shoppingItem: Omit<ShoppingItem, 'id'> = {
                        name: item.name,
                        details: '',
                        checked: false,
                        source: 'pantry',
                        addedAt: new Date().toISOString()
                    }
                    const newShoppingRef = doc(shoppingCollectionRef);
                    batch.set(newShoppingRef, shoppingItem);

                    // 2. Unselect PantryItem
                    const pantryItemRef = doc(pantryCollectionRef, item.id);
                    batch.update(pantryItemRef, { selected: false });
                }
            }

            await batch.commit()
            return selectedItems.length;
        } catch (err: any) {
            firestoreCollection.error.value = "Erreur de transfert: " + err.message
            throw err
        }
    }

    return {
        pantryItems: firestoreCollection.items,
        isLoading: firestoreCollection.isLoading,
        error: firestoreCollection.error,
        fetchPantryItems: firestoreCollection.fetchItems,
        addPantryItem: firestoreCollection.addItem,
        updatePantryItem: firestoreCollection.updateItem,
        deletePantryItem: firestoreCollection.deleteItem,
        setupRealtimeListener: firestoreCollection.setupRealtimeListener,
        transferSelectedToShoppingList,
        $reset: firestoreCollection.$reset
    }
})
