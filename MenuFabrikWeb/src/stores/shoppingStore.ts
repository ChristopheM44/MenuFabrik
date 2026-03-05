import { defineStore } from 'pinia'
import { writeBatch, collection, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { ShoppingItem } from '../models/ShoppingItem'
import { useAuthStore } from './authStore'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useShoppingStore = defineStore('shopping', () => {
    const firestoreCollection = useFirebaseCollection<ShoppingItem>('shoppingItems')
    const authStore = useAuthStore()

    const addItemsBatch = async (itemsToSave: Omit<ShoppingItem, 'id'>[]) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        try {
            const batch = writeBatch(db)
            const collectionRef = collection(db, 'users', authStore.user.uid, 'shoppingItems')

            for (const item of itemsToSave) {
                const itemRef = doc(collectionRef);
                batch.set(itemRef, item);
            }

            await batch.commit()
        } catch (err: any) {
            firestoreCollection.error.value = "Erreur de sauvegarde multiple: " + err.message
            throw err
        }
    }

    const clearCheckedItems = async () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        try {
            const batch = writeBatch(db)
            const collectionRef = collection(db, 'users', authStore.user.uid, 'shoppingItems')

            const checkedItems = firestoreCollection.items.value.filter(i => i.checked)
            for (const item of checkedItems) {
                if (item.id) {
                    const itemRef = doc(collectionRef, item.id);
                    batch.delete(itemRef);
                }
            }

            await batch.commit()
        } catch (err: any) {
            firestoreCollection.error.value = "Erreur de suppression: " + err.message
            throw err
        }
    }

    const clearAllItems = async () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        try {
            const batch = writeBatch(db)
            const collectionRef = collection(db, 'users', authStore.user.uid, 'shoppingItems')

            const allItems = firestoreCollection.items.value
            for (const item of allItems) {
                if (item.id) {
                    const itemRef = doc(collectionRef, item.id);
                    batch.delete(itemRef);
                }
            }

            await batch.commit()
        } catch (err: any) {
            firestoreCollection.error.value = "Erreur de réinitialisation: " + err.message
            throw err
        }
    }

    return {
        shoppingItems: firestoreCollection.items,
        isLoading: firestoreCollection.isLoading,
        error: firestoreCollection.error,
        fetchShoppingItems: firestoreCollection.fetchItems,
        addShoppingItem: firestoreCollection.addItem,
        updateShoppingItem: firestoreCollection.updateItem,
        deleteShoppingItem: firestoreCollection.deleteItem,
        setupRealtimeListener: firestoreCollection.setupRealtimeListener,
        addItemsBatch,
        clearCheckedItems,
        clearAllItems,
        $reset: firestoreCollection.$reset
    }
})

