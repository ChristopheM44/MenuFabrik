---
description: créer une nouvelle vue Vue dans MenuFabrik en suivant les conventions du projet
---

Conventions importantes pour toute nouvelle vue dans MenuFabrik :

**Stack:** Vue 3 (Composition API + `<script setup lang="ts">`), PrimeVue 4, TailwindCSS, Pinia stores, Firebase/Firestore via `useFirebaseCollection` composable.

**Structure d'une vue :**
1. `<script setup lang="ts">` en premier
2. Imports : stores Pinia, composables, PrimeVue components
3. Données locales avec `ref()` / `computed()`
4. `onMounted()` pour les fetchs initiaux
5. Template avec classes Tailwind + composants PrimeVue

**Étapes :**

1. Créer le fichier dans `src/views/NomDeLaView.vue` avec la structure standard
2. Ajouter la route dans `src/router/index.ts`
   - Utiliser `meta: { title: 'Titre affiché' }`
   - Utiliser import dynamique : `component: () => import('../views/NomDeLaView.vue')`
3. Si la vue nécessite un nouveau store, le créer dans `src/stores/nomStore.ts` en utilisant le composable `useFirebaseCollection`
4. Si la vue nécessite un nouveau composant dédié, le créer dans `src/components/`

**Chemin du router :** `src/router/index.ts`
**Couleurs/thème :** Utiliser les variables PrimeVue (`surface-*`, `primary-*`) pour respecter le dark mode automatiquement.
