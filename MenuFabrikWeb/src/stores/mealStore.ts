import { defineStore } from 'pinia'
import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Meal } from '../models/Meal'
import { useAuthStore } from './authStore'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'
import { commitInChunks } from '../utils/firestoreBatch'

export const useMealStore = defineStore('meal', () => {
    const firestoreCollection = useFirebaseCollection<Meal>('meals')
    const authStore = useAuthStore()

    const saveMealsBatch = async (mealsToSave: Meal[]) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        try {
            await commitInChunks(mealsToSave, (batch, meal) => {
                // Créer une copie nettoyée sans les propriétés relationnelles injectées
                // en utilisant la déstructuration explicite pour la sécurité TypeScript
                const { recipe, attendees, selectedSideDishes, ...cleanMealData } = meal;

                if (cleanMealData.id) {
                    // Update
                    const docRef = doc(db, 'users', authStore.user!.uid, 'meals', cleanMealData.id);
                    batch.update(docRef, cleanMealData as any);
                } else {
                    // Insert
                    const collectionRef = collection(db, 'users', authStore.user!.uid, 'meals');
                    const mealRef = doc(collectionRef);
                    batch.set(mealRef, cleanMealData);
                }
            });
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
