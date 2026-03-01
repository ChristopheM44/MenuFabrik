import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { SideDish } from '../models/SideDish'
import { useAuthStore } from './authStore'

export const useSideDishStore = defineStore('sideDish', () => {
    const sideDishes = ref<SideDish[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: Unsubscribe | null = null
    const authStore = useAuthStore()

    const getCollectionRef = () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return collection(db, 'users', authStore.user.uid, 'sideDishes')
    }

    const getDocRef = (id: string) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return doc(db, 'users', authStore.user.uid, 'sideDishes', id)
    }

    const fetchSideDishes = async () => {
        if (!authStore.user) return
        isLoading.value = true
        error.value = null
        try {
            const q = query(getCollectionRef())
            const querySnapshot = await getDocs(q)
            sideDishes.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SideDish))
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

    const addSideDish = async (sideDish: Omit<SideDish, 'id'>) => {
        try {
            const docRef = await addDoc(getCollectionRef(), sideDish)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateSideDish = async (id: string, updates: Partial<SideDish>) => {
        try {
            await updateDoc(getDocRef(id), updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteSideDish = async (id: string) => {
        try {
            await deleteDoc(getDocRef(id))
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const $reset = () => {
        sideDishes.value = []
        isLoading.value = false
        error.value = null
    }

    return { sideDishes, isLoading, error, fetchSideDishes, addSideDish, updateSideDish, deleteSideDish, setupRealtimeListener, $reset }
})
