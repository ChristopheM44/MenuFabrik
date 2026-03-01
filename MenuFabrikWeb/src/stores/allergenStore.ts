import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Allergen } from '../models/Allergen'

export const useAllergenStore = defineStore('allergen', () => {
    const allergens = ref<Allergen[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchAllergens = async () => {
        isLoading.value = true
        error.value = null
        try {
            const q = query(collection(db, 'allergens'))
            const querySnapshot = await getDocs(q)
            allergens.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Allergen))
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const setupRealtimeListener = () => {
        const q = query(collection(db, 'allergens'))
        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const exists = allergens.value.some(a => a.id === change.doc.id)
                    if (!exists) allergens.value.push({ id: change.doc.id, ...change.doc.data() } as Allergen)
                }
                if (change.type === 'modified') {
                    const index = allergens.value.findIndex(a => a.id === change.doc.id)
                    if (index !== -1) {
                        const item = allergens.value[index]
                        if (item) Object.assign(item, change.doc.data())
                    }
                }
                if (change.type === 'removed') {
                    const index = allergens.value.findIndex(a => a.id === change.doc.id)
                    if (index !== -1) allergens.value.splice(index, 1)
                }
            })
        }, (err) => {
            error.value = err.message
        })
    }

    const addAllergen = async (allergen: Omit<Allergen, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'allergens'), allergen)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateAllergen = async (id: string, updates: Partial<Allergen>) => {
        try {
            const allergenRef = doc(db, 'allergens', id)
            await updateDoc(allergenRef, updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteAllergen = async (id: string) => {
        try {
            const allergenRef = doc(db, 'allergens', id)
            await deleteDoc(allergenRef)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    return { allergens, isLoading, error, fetchAllergens, addAllergen, updateAllergen, deleteAllergen, setupRealtimeListener }
})
