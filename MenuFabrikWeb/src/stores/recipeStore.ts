import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Recipe } from '../models/Recipe'
import { useAuthStore } from './authStore'

export const useRecipeStore = defineStore('recipe', () => {
    const recipes = ref<Recipe[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: Unsubscribe | null = null

    const authStore = useAuthStore()

    const getCollectionRef = () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return collection(db, 'users', authStore.user.uid, 'recipes')
    }

    const getDocRef = (id: string) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return doc(db, 'users', authStore.user.uid, 'recipes', id)
    }

    const fetchRecipes = async () => {
        if (!authStore.user) return
        isLoading.value = true
        error.value = null
        try {
            const q = query(getCollectionRef())
            const querySnapshot = await getDocs(q)
            recipes.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe))
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
            recipes.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe))
        }, (err) => {
            error.value = err.message
        })

        return unsubscribe
    }

    // Auto-setup listener when user logs in/out
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

    const addRecipe = async (recipe: Omit<Recipe, 'id'>) => {
        try {
            const docRef = await addDoc(getCollectionRef(), recipe)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
        try {
            await updateDoc(getDocRef(id), updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteRecipe = async (id: string) => {
        try {
            await deleteDoc(getDocRef(id))
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const $reset = () => {
        recipes.value = []
        isLoading.value = false
        error.value = null
    }

    return { recipes, isLoading, error, fetchRecipes, addRecipe, updateRecipe, deleteRecipe, setupRealtimeListener, $reset }
})
