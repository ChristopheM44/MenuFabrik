# Audit Complet & Plan de Refactoring — MenuFabrikWeb

> Audit realise le 2026-03-26 par Claude Code.
> Base de code : Vue 3 + TypeScript + Firebase (Firestore + Auth) + PrimeVue 4 + Tailwind CSS 3

---

## 1. SECURITE

### 1.1 Cle Gemini exposee cote client — `src/services/GeminiService.ts:31`

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| IMPORTANT | `src/services/GeminiService.ts` | 31, 74 |

`VITE_GEMINI_API_KEY` est injectee dans le bundle JS client. N'importe qui peut l'extraire via DevTools.

**Risques :** Abus de l'API Gemini en votre nom (couts, rate limiting).

**Fix :** Configurer une restriction HTTP Referrer sur la cle dans Google AI Studio (gratuit, ne necessite pas Blaze).

---

### 1.2 Regles Firestore — Excellentes

| Priorite | Fichier |
|----------|---------|
| OK | `firestore.rules` |

Isolation complete par UID, validation de schema sur chaque collection, catch-all `allow: if false`, taille d'image limitee.

---

### 1.3 Categories desynchronisees Gemini / TypeScript / Firestore

| Priorite | Fichiers | Lignes |
|----------|----------|--------|
| CRITIQUE | `GeminiService.ts`, `firestore.rules`, `src/models/Recipe.ts`, `RecipesView.vue` | 63, 42, 11-21, 16 |

Les categories "Rapide" et "Au Four" sont envoyees par le prompt Gemini et utilisees dans les filtres UI mais :
- **Absentes** du type TypeScript `RecipeCategory`
- **Absentes** de la whitelist `firestore.rules:42`

=> Toute recette importee par IA avec categorie "Rapide" ou "Au Four" sera **rejetee par Firestore**.

**Fix :**
1. Ajouter `QUICK: "Rapide"` et `OVEN: "Au Four"` dans `RecipeCategory` (`src/models/Recipe.ts`)
2. Mettre a jour `firestore.rules:42` et `:54` avec ces deux valeurs
3. Verifier la coherence dans `RecipesView.vue:16`

---

### 1.4 RecipeShareService — Pas de signature

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| AMELIORATION | `src/services/RecipeShareService.ts` | 82 |

Encodage `btoa(encodeURIComponent(json))` sans HMAC. N'importe qui peut crafter un payload. Risque reel limite car Firestore rules valident le schema.

**Amelioration possible :** Ajouter un champ `version` + HMAC leger.

---

### 1.5 DataSeeder ne peut pas ecrire dans les collections publiques

| Priorite | Fichiers | Lignes |
|----------|----------|--------|
| IMPORTANT | `src/services/DataSeeder.ts`, `firestore.rules` | 21-23, 190-201 |

`DataSeeder.ts` appelle `clearCollection('public_recipes')` etc. depuis le SDK client. Mais `firestore.rules:192` dit `allow write: if false`.

=> Le DataSeeder **ne peut pas fonctionner** depuis le client.

**Fix :** Migrer le seeder vers un script Node.js avec Admin SDK, ou ajouter une condition `isAdmin()` aux regles des collections publiques.

---

### 1.6 Prompt Injection dans GeminiService

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| AMELIORATION | `src/services/GeminiService.ts` | 42, 45 |

`sourceURL` et `instructions` utilisateur interpoles directement dans le prompt sans echappement.

**Fix :** Encapsuler les inputs dans des delimiteurs :
```ts
promptText += `<user_url>${sourceURL}</user_url>`;
```

---

## 2. CODE MORT

### 2.1 `functions` dans firebase/config.ts

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| IMPORTANT | `src/firebase/config.ts` | 4, 23, 29 |

`getFunctions` est importe, initialise, et exporte. Aucun fichier dans `src/` n'importe `functions`. Ajoute ~50Ko inutiles au bundle.

**Fix :** Supprimer l'import, l'initialisation et l'export de `functions`.

---

### 2.2 Package `brew` dans package.json

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| CRITIQUE | `package.json` | 14 |

`"brew": "^0.0.8"` — Package npm sans rapport avec le projet. Potentiel risque supply chain.

**Fix :** `npm uninstall brew`

---

### 2.3 Double `setupRealtimeListener` dans ShoppingListView

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| AMELIORATION | `src/views/ShoppingListView.vue` | 89-90 |

Appelle `setupRealtimeListener()` manuellement alors que `useFirebaseCollection` le fait deja via le `watch` sur `authStore.user`. Redondant (pas de fuite grace au unsubscribe).

**Fix :** Supprimer les appels manuels lignes 89-90.

---

### 2.4 `onMounted` vides

| Priorite | Fichiers | Lignes |
|----------|----------|--------|
| NICE-TO-HAVE | `RecipesView.vue`, `MealsView.vue` | 19-21, 87-90 |

Blocs `onMounted` avec seulement des commentaires.

**Fix :** Supprimer ces blocs.

---

## 3. QUALITE ET BUGS POTENTIELS

### 3.1 `useCookingTimer` recoit `storageKey` non-reactif

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| IMPORTANT | `src/composables/useCookingMode.ts` | 24 |

```ts
const timerComposable = useCookingTimer(storageKey.value); // .value = string, pas reactif
```

Si `recipe.value` est `undefined` au mount, `storageKey.value` = `''` et le timer ne retrouvera jamais ses donnees.

**Fix :** Passer le computed directement et rendre `useCookingTimer` reactif :
```ts
const timerComposable = useCookingTimer(storageKey); // Ref, pas .value
```
Adapter `useCookingTimer` pour accepter un `Ref<string>` ou `ComputedRef<string>`.

---

### 3.2 Double persistSession dans useCookingMode

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| AMELIORATION | `src/composables/useCookingMode.ts` | 88, 95, 102, 118-120 |

`goNext()`, `goPrevious()`, `goToStep()` appellent `persistSession()` + le `watch(currentStepIndex)` aussi.

**Fix :** Supprimer les appels dans `goNext/goPrevious/goToStep` (garder le watcher).

---

### 3.3 localStorage sans gestion de quota

| Priorite | Fichiers | Lignes |
|----------|----------|--------|
| AMELIORATION | `useCookingMode.ts`, `useCookingTimer.ts`, `useTheme.ts` | 48, 38, 28/31 |

`localStorage.setItem()` peut throw `QuotaExceededError`.

**Fix :**
```ts
const safeSetItem = (key: string, value: string) => {
  try { localStorage.setItem(key, value); }
  catch { /* quota exceeded */ }
};
```

---

### 3.4 authStore seeding non chunke

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| IMPORTANT | `src/stores/authStore.ts` | 49-75 |

`checkAndInitializeUserSpace` copie toutes les collections publiques dans un seul `writeBatch`. Si >500 documents au total, le batch crash.

**Fix :** Utiliser `commitInChunks` comme dans `DataSeeder.ts`.

---

### 3.5 Categories "Rapide"/"Au Four" rejetees par Firestore

Voir section 1.3 ci-dessus.

---

### 3.6 useWakeLock — Event listener jamais nettoye

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| AMELIORATION | `src/composables/useWakeLock.ts` | 13 |

`wakeLock.addEventListener('release', ...)` ajoute un listener jamais retire. Memory leak si remount.

**Fix :** Stocker le handler, le retirer dans `releaseWakeLock()`.

---

### 3.7 useWakeLock — `release()` sans try-catch

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| AMELIORATION | `src/composables/useWakeLock.ts` | 24 |

`await wakeLock.release()` peut throw si deja released.

---

### 3.8 Suppression de journee sequentielle

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| AMELIORATION | `src/composables/useMealActions.ts` | 284-286 |

`confirmDeleteDay` supprime chaque repas en boucle sequentielle (N appels Firestore).

**Fix :** Utiliser `commitInChunks` pour la suppression batch.

---

### 3.9 MenuGeneratorEngine — aucune recette disponible

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| AMELIORATION | `src/services/MenuGeneratorEngine.ts` | 40-43 |

Si aucun candidat, `console.warn` silencieux. L'utilisateur n'a aucun feedback.

**Fix :** Remonter un compteur et afficher un toast.

---

## 4. HARMONISATION ET COHERENCE

### 4.1 Error handling mixte

| Priorite | Impact |
|----------|--------|
| IMPORTANT | 10+ fichiers concernes |

| Pattern | Utilise dans |
|---------|-------------|
| `toast.add()` direct | ShoppingCartPanel, PantryPanel, ImportRecipeView |
| `notifyError()` wrapper | useMealActions uniquement |
| `console.error()` seul | cookingMode, cookingTimer |
| `store.error.value` | useFirebaseCollection, stores |

**Fix :** Creer un composable `useNotify()` centralise.

---

### 4.2 40+ occurrences de `catch (err: any)`

| Priorite | Impact |
|----------|--------|
| AMELIORATION | Tout le codebase |

Tous les `catch (err: any)` devraient etre `catch (err: unknown)` avec type guard.

Aussi :
- `DataSeeder.ts:30,46` — `ref: any` (devrait etre `DocumentReference`)
- `ShoppingListView.vue:22,28,47` — `any[]`, `data: any`
- `mealStore.ts:24` — `cleanMealData as any`

---

### 4.3 Delete recette sans confirmation

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| IMPORTANT | `src/views/RecipesView.vue` | 93 |

```ts
@delete="(r) => recipeStore.deleteRecipe(r.id!)"
```

Supprime directement sans `useAppConfirm`, contrairement a tous les autres deletes.

**Fix :** Ajouter un `confirm()` via `useAppConfirm`.

---

### 4.4 CookingModeView n'utilise pas useAppConfirm

| Priorite | Fichier |
|----------|---------|
| AMELIORATION | `src/views/CookingModeView.vue` |

Utilise un `Dialog` PrimeVue hardcode au lieu du composable standardise.

---

### 4.5 Settings tabs sans error handling

| Priorite | Fichiers |
|----------|----------|
| AMELIORATION | `SettingsParticipantsTab.vue`, `SettingsAllergensTab.vue`, `SettingsSideDishesTab.vue` |

Les operations CRUD n'ont aucun `try-catch` ni toast d'erreur.

---

### 4.6 PlanMealDialog re-definit getLocalISODate localement

| Priorite | Fichier |
|----------|---------|
| AMELIORATION | `src/components/planning/PlanMealDialog.vue` |

La fonction existe deja dans `src/utils/dateUtils.ts`. Import manque.

---

## 5. OPPORTUNITES DE COMPOSABLES

### 5.1 Logique de recherche/filtrage dupliquee

| Priorite | Fichiers |
|----------|----------|
| AMELIORATION | `RecipesView.vue:23-36`, `useMealsPlanningData.ts:72-82`, `RecipePickerDialog.vue` |

Meme pattern : filtrer par texte (nom + categorie) + tri alphabetique.

**Composable suggere :** `useRecipeFilter(recipes, searchQuery, categoryFilter)`

---

### 5.2 Toast patterns disperses

| Priorite | Impact |
|----------|--------|
| AMELIORATION | 10+ fichiers |

Chaque fichier instancie `useToast()` independamment.

**Composable suggere :** `useNotify()` centralisant `severity`, `life`, format des messages.

---

### 5.3 Dialog visibility + target pattern

| Priorite | Fichiers |
|----------|----------|
| AMELIORATION | `MealsView.vue` (3x), `ShoppingListView.vue` (2x) |

Pattern repete :
```ts
const showXDialog = ref(false);
const targetXId = ref('');
```

**Composable suggere :** `useDialog<T>()` retournant `{ visible, target, open(t), close() }`.

---

### 5.4 Inline editing pattern triple

| Priorite | Fichiers |
|----------|----------|
| AMELIORATION | `SettingsAllergensTab.vue`, `SettingsSideDishesTab.vue`, `PantryPanel.vue` |

Trio `editingId`, `editingName`, `startEdit()`, `saveEdit()`, `cancelEdit()` copie-colle.

**Composable suggere :** `useInlineEdit<T>(updateFn)`

---

## 6. PERFORMANCE

### 6.1 getHydratedMeals — O(n*m) a chaque changement de store

| Priorite | Fichier | Lignes |
|----------|---------|--------|
| IMPORTANT | `src/composables/useMealsPlanningData.ts` | 32-34 |

Chaque modification dans l'un des 4 stores declanche une re-hydratation complete de TOUS les repas. `hydrateMeal` fait 3 `find()`/`filter()` par repas.

**Fix :** Construire une Map id->object pour chaque store :
```ts
const recipeMap = computed(() => new Map(recipeStore.recipes.map(r => [r.id, r])));
```

---

### 6.2 Images Base64 dans Firestore

| Priorite | Impact |
|----------|--------|
| AMELIORATION | Performance reseau |

Chaque `onSnapshot` telecharge toutes les images. 50 recettes a ~50Ko = ~2.5Mo par sync.

**Amelioration future :** Migrer vers Firebase Storage + URL.

---

### 6.3 8 listeners onSnapshot simultanes

| Priorite | Impact |
|----------|--------|
| AMELIORATION | Consommation reads Firestore |

7 stores + authStore = 8 connections permanentes. Acceptable pour usage familial.

---

## 7. ARCHITECTURE

### 7.1 Pas de duplication seedData

`src/utils/seedData.ts` n'existe pas. `DataSeeder.ts` importe correctement depuis `src/data/seedData.ts`.

---

### 7.2 functions export mort dans config.ts

Voir section 2.1.

---

### 7.3 Stores initialises dans App.vue — Correct

Le pattern est adapte. Pas besoin d'un plugin Pinia.

---

### 7.4 Router guards — Complets

Auth check async, redirect login, admin gate par email.

---

### 7.5 RecipeShareService — URLs potentiellement trop longues

| Priorite | Fichier | Ligne |
|----------|---------|-------|
| AMELIORATION | `src/services/RecipeShareService.ts` | 86 |

`btoa(encodeURIComponent(json))` produit des URLs longues. Certains navigateurs coupent > 2048 chars.

**Amelioration :** Compresser avec `pako` ou stocker dans Firestore avec short ID.

---

## Resume par priorite

| Prio | # | Probleme |
|------|---|----------|
| CRITIQUE | 1.3/3.5 | Categories "Rapide"/"Au Four" rejetees par Firestore |
| CRITIQUE | 2.2 | Package `brew` suspect dans dependencies |
| IMPORTANT | 1.5 | DataSeeder ne peut pas ecrire (rules bloquent) |
| IMPORTANT | 3.4 | authStore seeding non chunke (>500 = crash) |
| IMPORTANT | 3.1 | `useCookingTimer` recoit storageKey non-reactif |
| IMPORTANT | 4.1 | Error handling incoherent |
| IMPORTANT | 4.3 | Delete recette sans confirmation |
| IMPORTANT | 2.1 | `firebase/functions` mort — bundle bloat |
| IMPORTANT | 6.1 | `getHydratedMeals` O(n*m) recalcule trop souvent |
| IMPORTANT | 1.1 | Cle Gemini sans restriction de domaine |
| AMELIORATION | 3.2 | Double persistSession dans useCookingMode |
| AMELIORATION | 3.3 | localStorage sans gestion quota |
| AMELIORATION | 3.6 | WakeLock event listener jamais nettoye |
| AMELIORATION | 4.2 | 40+ `catch (err: any)` |
| AMELIORATION | 2.3 | Double setupRealtimeListener ShoppingListView |
| AMELIORATION | 5.1-4 | Opportunites de composables (filter, notify, dialog, inlineEdit) |
| AMELIORATION | 3.8 | Suppression journee sequentielle |
| AMELIORATION | 4.4 | CookingModeView n'utilise pas useAppConfirm |
| AMELIORATION | 4.5 | Settings tabs sans error handling |
| AMELIORATION | 4.6 | PlanMealDialog re-definit getLocalISODate |
| AMELIORATION | 1.4 | RecipeShareService sans signature |
| AMELIORATION | 1.6 | Prompt injection GeminiService |
| AMELIORATION | 6.2 | Images Base64 dans Firestore |
| AMELIORATION | 7.5 | URLs de partage trop longues |
| NICE-TO-HAVE | 2.4 | onMounted vides |
| NICE-TO-HAVE | 6.3 | 8 listeners simultanes |
