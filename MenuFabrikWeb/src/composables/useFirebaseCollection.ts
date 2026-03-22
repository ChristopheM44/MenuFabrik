import { ref, watch, type Ref } from 'vue'
import { collection, doc, query, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, type WithFieldValue, type UpdateData } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuthStore } from '../stores/authStore'

export function useFirebaseCollection<T extends { id?: string }>(collectionName: string) {
    const items = ref<T[]>([]) as Ref<T[]>
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: Unsubscribe | null = null
    const authStore = useAuthStore()

    const getCollectionRef = () => {
        if (!authStore.user) throw new Error("Accès refusé. Veuillez vous reconnecter.")
        return collection(db, 'users', authStore.user.uid, collectionName)
    }

    const getDocRef = (id: string) => {
        if (!authStore.user) throw new Error("Accès refusé. Veuillez vous reconnecter.")
        return doc(db, 'users', authStore.user.uid, collectionName, id)
    }

    const fetchItems = async () => {
        if (!authStore.user) return
        isLoading.value = true
        error.value = null
        try {
            const q = query(getCollectionRef())
            const querySnapshot = await getDocs(q)
            items.value = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as T))
        } catch (err: any) {
            error.value = "Erreur lors du chargement : " + (err.message || 'Erreur inconnue')
            console.error(err)
        } finally {
            isLoading.value = false
        }
    }

    const setupRealtimeListener = () => {
        if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
        }
        if (!authStore.user) return

        const q = query(getCollectionRef())
        unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const exists = items.value.some(item => item.id === change.doc.id)
                    if (!exists) {
                        items.value.push({ id: change.doc.id, ...change.doc.data() } as T)
                    }
                }
                if (change.type === 'modified') {
                    const index = items.value.findIndex(item => item.id === change.doc.id)
                    if (index !== -1) {
                        // Remplacement immutable — plus sûr et compatible réactivité Vue (audit 3.5)
                        items.value[index] = { id: change.doc.id, ...change.doc.data() } as T;
                    }
                }
                if (change.type === 'removed') {
                    const index = items.value.findIndex(item => item.id === change.doc.id)
                    if (index !== -1) items.value.splice(index, 1)
                }
            })
            // Unclear if we should clear error here, maybe.
            error.value = null
        }, (err) => {
            error.value = "Erreur de synchronisation : " + (err.message || 'Erreur inconnue')
            console.error(err)
        })

        return unsubscribe
    }

    // Auto-setup and teardown based on auth state
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

    const addItem = async (item: Omit<T, 'id'>) => {
        try {
            const docRef = await addDoc(getCollectionRef(), item as WithFieldValue<Omit<T, 'id'>>)
            return docRef.id
        } catch (err: any) {
            error.value = "Erreur de création : " + (err.message || 'Permission refusée')
            console.error(err)
            throw err
        }
    }

    const updateItem = async (id: string, updates: Partial<T>) => {
        try {
            await updateDoc(getDocRef(id), updates as UpdateData<T>)
        } catch (err: any) {
            error.value = "Erreur de mise à jour : " + (err.message || 'Permission refusée')
            console.error(err)
            throw err
        }
    }

    const deleteItem = async (id: string) => {
        try {
            await deleteDoc(getDocRef(id))
        } catch (err: any) {
            error.value = "Erreur de suppression : " + (err.message || 'Permission refusée')
            console.error(err)
            throw err
        }
    }

    const $reset = () => {
        items.value = []
        isLoading.value = false
        error.value = null
        if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
        }
    }

    return {
        items,
        isLoading,
        error,
        fetchItems,
        setupRealtimeListener,
        addItem,
        updateItem,
        deleteItem,
        $reset
    }
}
