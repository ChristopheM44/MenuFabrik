import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Recipe } from '../models/Recipe'

export const useRecipeStore = defineStore('recipe', () => {
    const recipes = ref<Recipe[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchRecipes = async () => {
        isLoading.value = true
        error.value = null
        try {
            const q = query(collection(db, 'recipes'))
            const querySnapshot = await getDocs(q)
            recipes.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe))
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    // Optional: Real-time listener
    const setupRealtimeListener = () => {
        const q = query(collection(db, 'recipes'))
        return onSnapshot(q, (snapshot) => {
            recipes.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe))
        }, (err) => {
            error.value = err.message
        })
    }

    const addRecipe = async (recipe: Omit<Recipe, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'recipes'), recipe)
            recipes.value.push({ id: docRef.id, ...recipe })
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
        try {
            const recipeRef = doc(db, 'recipes', id)
            await updateDoc(recipeRef, updates)
            const index = recipes.value.findIndex(r => r.id === id)
            if (index !== -1) {
                recipes.value[index] = { ...recipes.value[index], ...(updates as any) }
            }
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteRecipe = async (id: string) => {
        try {
            const recipeRef = doc(db, 'recipes', id)
            await deleteDoc(recipeRef)
            recipes.value = recipes.value.filter(r => r.id !== id)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    return { recipes, isLoading, error, fetchRecipes, addRecipe, updateRecipe, deleteRecipe, setupRealtimeListener }
})
