import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Participant } from '../models/Participant'

export const useParticipantStore = defineStore('participant', () => {
    const participants = ref<Participant[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchParticipants = async () => {
        isLoading.value = true
        error.value = null
        try {
            const q = query(collection(db, 'participants'))
            const querySnapshot = await getDocs(q)
            participants.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant))
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const setupRealtimeListener = () => {
        const q = query(collection(db, 'participants'))
        return onSnapshot(q, (snapshot) => {
            participants.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant))
        }, (err) => {
            error.value = err.message
        })
    }

    const addParticipant = async (participant: Omit<Participant, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'participants'), participant)
            return docRef.id
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const updateParticipant = async (id: string, updates: Partial<Participant>) => {
        try {
            const participantRef = doc(db, 'participants', id)
            await updateDoc(participantRef, updates)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    const deleteParticipant = async (id: string) => {
        try {
            const participantRef = doc(db, 'participants', id)
            await deleteDoc(participantRef)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    return { participants, isLoading, error, fetchParticipants, addParticipant, updateParticipant, deleteParticipant, setupRealtimeListener }
})
