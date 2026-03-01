import { defineStore } from 'pinia'
import { writeBatch, collection, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Meal } from '../models/Meal'
import { useAuthStore } from './authStore'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useMealStore = defineStore('meal', () => {
    const firestoreCollection = useFirebaseCollection<Meal>('meals')
    const authStore = useAuthStore()

    const saveMealsBatch = async (mealsToSave: Meal[]) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        try {
            const batch = writeBatch(db)

            for (const meal of mealsToSave) {
                // Créer une copie nettoyée sans les propriétés relationnelles injectées
                const mealData = { ...meal }
                delete mealData.recipe
                delete mealData.attendees
                delete mealData.selectedSideDishes

                if (meal.id) {
                    // Update
                    const docRef = doc(db, 'users', authStore.user.uid, 'meals', meal.id)
                    batch.update(docRef, mealData as any)
                } else {
                    // Insert
                    const collectionRef = collection(db, 'users', authStore.user.uid, 'meals')
                    const mealRef = doc(collectionRef)
                    batch.set(mealRef, mealData)
                }
            }

            await batch.commit()
        } catch (err: any) {
            firestoreCollection.error.value = "Erreur de sauvegarde: " + err.message
            throw err
        }
    }

    return {
        meals: firestoreCollection.items,
        isLoading: firestoreCollection.isLoading,
        error: firestoreCollection.error,
        fetchMeals: firestoreCollection.fetchItems,
        addMeal: firestoreCollection.addItem,
        updateMeal: firestoreCollection.updateItem,
        deleteMeal: firestoreCollection.deleteItem,
        setupRealtimeListener: firestoreCollection.setupRealtimeListener,
        saveMealsBatch,
        $reset: firestoreCollection.$reset
    }
})
