import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot, writeBatch } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Meal } from '../models/Meal'
import { useAuthStore } from './authStore'

export const useMealStore = defineStore('meal', () => {
    const meals = ref<Meal[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: Unsubscribe | null = null
    const authStore = useAuthStore()

    const getCollectionRef = () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return collection(db, 'users', authStore.user.uid, 'meals')
    }

    const getDocRef = (id: string) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return doc(db, 'users', authStore.user.uid, 'meals', id)
    }

    const fetchMeals = async () => {
        if (!authStore.user) return
        isLoading.value = true
        error.value = null
        try {
            const q = query(getCollectionRef())
            const querySnapshot = await getDocs(q)
            meals.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal))
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const setupRealtimeListener = () => {
        if (unsubscribe) unsubscribe()
        if (!authStore.user) return

        const q = query(getCollectionRef())
        unsubscribe = onSnapshot(q, (snapshot) => {
            meals.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal))
        }, (err) => {
            error.value = err.message
        })

        return unsubscribe
    }

    watch(() => authStore.user, (user) => {
        if (user) {
            setupRealtimeListener()
        } else {
            if (unsubscribe) {
                unsubscribe()
                unsubscribe = null
            }
            $reset()
        }
    }, { immediate: true })

    const addMeal = async (meal: Omit<Meal, 'id'>) => {
        try {
            const docRef = await addDoc(getCollectionRef(), meal)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateMeal = async (id: string, updates: Partial<Meal>) => {
        try {
            await updateDoc(getDocRef(id), updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteMeal = async (id: string) => {
        try {
            await deleteDoc(getDocRef(id))
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

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
                    batch.update(getDocRef(meal.id), mealData as any)
                } else {
                    // Insert
                    const mealRef = doc(getCollectionRef())
                    batch.set(mealRef, mealData)
                }
            }

            await batch.commit()
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const $reset = () => {
        meals.value = []
        isLoading.value = false
        error.value = null
    }

    return { meals, isLoading, error, fetchMeals, addMeal, updateMeal, deleteMeal, setupRealtimeListener, saveMealsBatch, $reset }
})
