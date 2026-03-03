import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db, googleProvider } from '../firebase/config'
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth'
import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const isInitializedInApp = ref(false) // Whether Firebase Auth has resolved initial state
    const isUserDbInitialized = ref(false) // Whether the user's private DB is cloned
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const setupAuthListener = () => {
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                user.value = firebaseUser
                await checkAndInitializeUserSpace(firebaseUser.uid)
            } else {
                user.value = null
                isUserDbInitialized.value = false
            }
            isInitializedInApp.value = true
        })
    }

    const checkAndInitializeUserSpace = async (uid: string) => {
        try {
            const profileRef = doc(db, 'users', uid, 'profile', 'data')
            const profileSnap = await getDoc(profileRef)

            if (profileSnap.exists() && profileSnap.data().isInitialized) {
                isUserDbInitialized.value = true
                return
            }

            // If not initialized, start the cloning process
            isLoading.value = true
            isUserDbInitialized.value = false

            const batch = writeBatch(db)

            // Copy public_recipes
            const recipesSnap = await getDocs(collection(db, 'public_recipes'))
            recipesSnap.forEach(r => {
                const newRef = doc(db, 'users', uid, 'recipes', r.id)
                batch.set(newRef, r.data())
            })

            // Copy public_allergens
            const allergensSnap = await getDocs(collection(db, 'public_allergens'))
            allergensSnap.forEach(a => {
                const newRef = doc(db, 'users', uid, 'allergens', a.id)
                batch.set(newRef, a.data())
            })

            // Copy public_sideDishes
            const sideDishesSnap = await getDocs(collection(db, 'public_sideDishes'))
            sideDishesSnap.forEach(s => {
                const newRef = doc(db, 'users', uid, 'sideDishes', s.id)
                batch.set(newRef, s.data())
            })

            // Mark as initialized
            batch.set(profileRef, { isInitialized: true, createdAt: serverTimestamp() })

            await batch.commit()
            isUserDbInitialized.value = true
        } catch (err: any) {
            console.error("Error initializing user space:", err)
            error.value = "Erreur lors de l'initialisation de votre espace personnel."
        } finally {
            isLoading.value = false
        }
    }

    const loginWithGoogle = async () => {
        isLoading.value = true
        error.value = null
        try {
            await signInWithPopup(auth, googleProvider)
            router.push('/')
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const loginWithEmail = async (email: string, pass: string) => {
        isLoading.value = true
        error.value = null
        try {
            await signInWithEmailAndPassword(auth, email, pass)
            router.push('/')
        } catch (err: any) {
            error.value = "Identifiants invalides."
        } finally {
            isLoading.value = false
        }
    }

    const registerWithEmail = async (email: string, pass: string) => {
        isLoading.value = true
        error.value = null
        try {
            await createUserWithEmailAndPassword(auth, email, pass)
            router.push('/')
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const logout = async () => {
        isLoading.value = true
        error.value = null
        try {
            await signOut(auth)
            router.push('/login')
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    return {
        user,
        isInitializedInApp,
        isUserDbInitialized,
        isLoading,
        error,
        setupAuthListener,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout
    }
})
