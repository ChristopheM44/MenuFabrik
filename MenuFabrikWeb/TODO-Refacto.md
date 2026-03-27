# TODO — Plan de Refactoring MenuFabrikWeb

> Suivi d'implementation base sur l'audit du 2026-03-26.
> Ref complete : [RefactoComplet.md](./RefactoComplet.md)

---

## CRITIQUE

- [x] **1.3** Aligner categories Gemini / TypeScript / Firestore
  - [x] Ajouter "Rapide", "Au Four" et "Sans Gluten" dans `RecipeCategory` (`src/models/Recipe.ts`)
  - [x] Mettre a jour `firestore.rules:42` et `:54`
  - [x] Verifier coherence dans `RecipesView.vue:16`, `RecipePickerDialog.vue:23`
  - [x] Ajouter couleurs dans `categoryUtils.ts`
  - [x] Mettre a jour le prompt Gemini dans `GeminiService.ts:63`
- [x] **2.2** Supprimer le package `brew` de package.json (`npm uninstall brew`)

---

## IMPORTANT

- [ ] **1.5** Corriger DataSeeder — soit migrer vers Admin SDK, soit ajuster les rules
- [ ] **3.4** authStore : utiliser `commitInChunks` dans `checkAndInitializeUserSpace`
- [x] **3.1** Rendre `useCookingTimer` reactif (passer `Ref<string>` au lieu de `string`)
- [x] **4.1** Creer composable `useNotify()` centralise et migrer tous les toast.add disperses
- [x] **4.3** Ajouter confirmation `useAppConfirm` avant delete dans `RecipesView.vue:93`
- [ ] **2.1** Supprimer `firebase/functions` de `src/firebase/config.ts` (import + init + export)
- [ ] **6.1** Optimiser `getHydratedMeals` avec des Map id->object au lieu de find/filter
- [ ] **1.1** Configurer restriction HTTP Referrer sur la cle Gemini dans Google AI Studio

---

## AMELIORATION

### Error handling & robustesse
- [ ] **4.2** Remplacer tous les `catch (err: any)` par `catch (err: unknown)` + type guard
- [ ] **3.3** Creer helper `safeSetItem` pour localStorage (quota exceeded)
- [ ] **4.5** Ajouter try-catch + toast dans les Settings tabs (Allergens, SideDishes, Participants)
- [ ] **3.6** useWakeLock : stocker le handler `release` et le retirer dans cleanup
- [ ] **3.7** useWakeLock : ajouter try-catch sur `wakeLock.release()`

### Coherence des patterns
- [ ] **3.2** useCookingMode : supprimer les appels `persistSession()` dans goNext/goPrevious/goToStep
- [ ] **2.3** ShoppingListView : supprimer les `setupRealtimeListener()` redondants (L89-90)
- [ ] **4.4** CookingModeView : migrer vers `useAppConfirm` au lieu du Dialog hardcode
- [ ] **4.6** PlanMealDialog : importer `getLocalISODate` depuis `dateUtils.ts`

### Nouveaux composables
- [x] **5.2** Creer `useNotify()` — wrapper centralise de useToast (cf. 4.1)
- [ ] **5.3** Creer `useDialog<T>()` — { visible, target, open(), close() }
- [ ] **5.4** Creer `useInlineEdit<T>(updateFn)` — editingId, editingName, start/save/cancel
- [ ] **5.1** Creer `useRecipeFilter(recipes, query, category)` — logique filtrage partagee

### Performance
- [ ] **3.8** useMealActions.confirmDeleteDay : utiliser `commitInChunks` pour suppression batch

### Securite
- [ ] **1.6** GeminiService : encapsuler inputs utilisateur dans des delimiteurs XML
- [ ] **1.4** RecipeShareService : ajouter champ `version` au payload

---

## NICE-TO-HAVE

- [ ] **2.4** Supprimer les `onMounted` vides dans RecipesView et MealsView
- [ ] **3.9** MenuGeneratorEngine : remonter feedback quand aucune recette compatible
- [ ] **6.2** Etudier migration images Base64 -> Firebase Storage + URL
- [ ] **7.5** RecipeShareService : compresser payload (pako) ou stocker dans Firestore
- [ ] **6.3** Documenter les 8 listeners simultanes (acceptable pour usage familial)

---

## Progression

| Categorie | Total | Fait | Reste |
|-----------|-------|------|-------|
| Categorie | Total | Fait | Reste |
|-----------|-------|------|-------|
| Critique | 2 | 2 | 0 |
| Important | 8 | 3 | 5 |
| Amelioration | 18 | 1 | 17 |
| Nice-to-have | 5 | 0 | 5 |
| **Total** | **33** | **6** | **27** |
