import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Participant } from '../models/Participant'
import { useAuthStore } from './authStore'

export const useParticipantStore = defineStore('participant', () => {
    const participants = ref<Participant[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: Unsubscribe | null = null
    const authStore = useAuthStore()

    const getCollectionRef = () => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return collection(db, 'users', authStore.user.uid, 'participants')
    }

    const getDocRef = (id: string) => {
        if (!authStore.user) throw new Error("Utilisateur non authentifié")
        return doc(db, 'users', authStore.user.uid, 'participants', id)
    }

    const fetchParticipants = async () => {
        if (!authStore.user) return
        isLoading.value = true
        error.value = null
        try {
            const q = query(getCollectionRef())
            const querySnapshot = await getDocs(q)
            participants.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant))
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
            participants.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant))
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

    const addParticipant = async (participant: Omit<Participant, 'id'>) => {
        try {
            const docRef = await addDoc(getCollectionRef(), participant)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateParticipant = async (id: string, updates: Partial<Participant>) => {
        try {
            await updateDoc(getDocRef(id), updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteParticipant = async (id: string) => {
        try {
            await deleteDoc(getDocRef(id))
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const $reset = () => {
        participants.value = []
        isLoading.value = false
        error.value = null
    }

    return { participants, isLoading, error, fetchParticipants, addParticipant, updateParticipant, deleteParticipant, setupRealtimeListener, $reset }
})
