import { defineStore } from 'pinia'
import type { Participant } from '../models/Participant'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useParticipantStore = defineStore('participant', () => {
    const collection = useFirebaseCollection<Participant>('participants')

    return {
        participants: collection.items,
        isLoading: collection.isLoading,
        error: collection.error,
        fetchParticipants: collection.fetchItems,
        ensureReady: collection.ensureReady,
        addParticipant: collection.addItem,
        updateParticipant: collection.updateItem,
        deleteParticipant: collection.deleteItem,
        setupRealtimeListener: collection.setupRealtimeListener,
        $reset: collection.$reset
    }
})
