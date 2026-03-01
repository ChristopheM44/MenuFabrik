import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Allergen } from '../models/Allergen'
import { useAuthStore } from './authStore'

export const useAllergenStore = defineStore('allergen', () => {
    const allergens = ref<Allergen[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: Unsubscribe | null = null
    const authStore = useAuthStore()

    const getCollectionRef = () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return collection(db, 'users', authStore.user.uid, 'allergens')
    }

    const getDocRef = (id: string) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return doc(db, 'users', authStore.user.uid, 'allergens', id)
    }

    const fetchAllergens = async () => {
        if (!authStore.user) return
        isLoading.value = true
        error.value = null
        try {
            const q = query(getCollectionRef())
            const querySnapshot = await getDocs(q)
            allergens.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Allergen))
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

    const addAllergen = async (allergen: Omit<Allergen, 'id'>) => {
        try {
            const docRef = await addDoc(getCollectionRef(), allergen)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateAllergen = async (id: string, updates: Partial<Allergen>) => {
        try {
            await updateDoc(getDocRef(id), updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteAllergen = async (id: string) => {
        try {
            await deleteDoc(getDocRef(id))
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const $reset = () => {
        allergens.value = []
        isLoading.value = false
        error.value = null
    }

    return { allergens, isLoading, error, fetchAllergens, addAllergen, updateAllergen, deleteAllergen, setupRealtimeListener, $reset }
})
