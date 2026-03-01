import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Meal } from '../models/Meal'

export const useMealStore = defineStore('meal', () => {
    const meals = ref<Meal[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchMeals = async () => {
        isLoading.value = true
        error.value = null
        try {
            const q = query(collection(db, 'meals'))
            const querySnapshot = await getDocs(q)
            meals.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal))
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const setupRealtimeListener = () => {
        const q = query(collection(db, 'meals'))
        return onSnapshot(q, (snapshot) => {
            meals.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal))
        }, (err) => {
            error.value = err.message
        })
    }

    const addMeal = async (meal: Omit<Meal, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'meals'), meal)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateMeal = async (id: string, updates: Partial<Meal>) => {
        try {
            const mealRef = doc(db, 'meals', id)
            await updateDoc(mealRef, updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteMeal = async (id: string) => {
        try {
            const mealRef = doc(db, 'meals', id)
            await deleteDoc(mealRef)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const saveMealsBatch = async (mealsToSave: Meal[]) => {
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
                    const mealRef = doc(db, 'meals', meal.id)
                    batch.update(mealRef, mealData as any)
                } else {
                    // Insert
                    const mealRef = doc(collection(db, 'meals'))
                    batch.set(mealRef, mealData)
                }
            }

            await batch.commit()
            // Note: with setupRealtimeListener active, local state updates automatically.
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    return { meals, isLoading, error, fetchMeals, addMeal, updateMeal, deleteMeal, setupRealtimeListener, saveMealsBatch }
})
