---
description: créer un nouveau store Pinia pour une collection Firestore dans MenuFabrik
---

MenuFabrik utilise un composable générique `useFirebaseCollection<T>` qui gère automatiquement les opérations CRUD Firestore et le listener temps réel.

**Pattern standard d'un store :**

```typescript
import { defineStore } from 'pinia'
import type { MonModele } from '../models/MonModele'
import { useAuthStore } from './authStore'
import { useFirebaseCollection } from '../composables/useFirebaseCollection'

export const useMonStore = defineStore('mon-store', () => {
    const firestoreCollection = useFirebaseCollection<MonModele>('nom-collection-firestore')
    const authStore = useAuthStore()

    // Actions supplémentaires si nécessaire...

    return {
        items: firestoreCollection.items,
        isLoading: firestoreCollection.isLoading,
        error: firestoreCollection.error,
        fetchItems: firestoreCollection.fetchItems,
        addItem: firestoreCollection.addItem,
        updateItem: firestoreCollection.updateItem,
        deleteItem: firestoreCollection.deleteItem,
        setupRealtimeListener: firestoreCollection.setupRealtimeListener,
        $reset: firestoreCollection.$reset
    }
})
```

**Étapes :**

1. Créer le modèle TypeScript dans `src/models/MonModele.ts`
2. Créer le store dans `src/stores/monStore.ts` en suivant le pattern ci-dessus
3. La collection Firestore est sous `users/{uid}/nom-collection` (géré automatiquement par `useFirebaseCollection`)
4. Importer et utiliser le store dans les vues avec `const monStore = useMonStore()`

**Composable clé :** `src/composables/useFirebaseCollection.ts`
