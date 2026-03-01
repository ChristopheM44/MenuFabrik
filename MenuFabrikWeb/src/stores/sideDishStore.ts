import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { SideDish } from '../models/SideDish'

export const useSideDishStore = defineStore('sideDish', () => {
    const sideDishes = ref<SideDish[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchSideDishes = async () => {
        isLoading.value = true
        error.value = null
        try {
            const q = query(collection(db, 'sideDishes'))
            const querySnapshot = await getDocs(q)
            sideDishes.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SideDish))
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const setupRealtimeListener = () => {
        const q = query(collection(db, 'sideDishes'))
        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const exists = sideDishes.value.some(sd => sd.id === change.doc.id)
                    if (!exists) sideDishes.value.push({ id: change.doc.id, ...change.doc.data() } as SideDish)
                }
                if (change.type === 'modified') {
                    const index = sideDishes.value.findIndex(sd => sd.id === change.doc.id)
                    if (index !== -1) {
                        const item = sideDishes.value[index]
                        if (item) Object.assign(item, change.doc.data())
                    }
                }
                if (change.type === 'removed') {
                    const index = sideDishes.value.findIndex(sd => sd.id === change.doc.id)
                    if (index !== -1) sideDishes.value.splice(index, 1)
                }
            })
        }, (err) => {
            error.value = err.message
        })
    }

    const addSideDish = async (sideDish: Omit<SideDish, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'sideDishes'), sideDish)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateSideDish = async (id: string, updates: Partial<SideDish>) => {
        try {
            const sideDishRef = doc(db, 'sideDishes', id)
            await updateDoc(sideDishRef, updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteSideDish = async (id: string) => {
        try {
            const sideDishRef = doc(db, 'sideDishes', id)
            await deleteDoc(sideDishRef)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    return { sideDishes, isLoading, error, fetchSideDishes, addSideDish, updateSideDish, deleteSideDish, setupRealtimeListener }
})
