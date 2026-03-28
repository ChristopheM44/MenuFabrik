# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check (vue-tsc) then build production bundle to /dist
npm run preview   # Serve /dist locally to test production build
npm run deploy    # Build + deploy to Firebase Hosting and Firestore
```

No test runner or linter is configured. TypeScript strict mode serves as the primary correctness check.

## Architecture Overview

**MenuFabrikWeb** is a Vue 3 PWA for family meal planning. It allows planning meals on a weekly calendar, managing a recipe database, generating shopping lists, and cooking step-by-step. Features AI-powered recipe import via Google Gemini.

### Stack
- **Vue 3** with `<script setup>` + TypeScript strict mode
- **Pinia** for state management
- **Firebase** (Firestore + Auth + Hosting) as the backend
- **PrimeVue 4** + **Tailwind CSS 3** for UI
- **Vite** as build tool with `vite-plugin-pwa`

### Data Flow

All user data lives in Firestore under `/users/{uid}/{collection}`. The central abstraction is `useFirebaseCollection<T>` (composable) which wraps `onSnapshot()` to provide real-time sync, CRUD operations, and cleanup on logout. Every Pinia store simply wraps this composable for a specific collection.

**Hydration pattern:** Meals store only IDs (recipeId, attendeeIds, selectedSideDishIds). `hydrateMeal()` in `src/utils/hydrateMeal.ts` joins those IDs with full objects from the relevant stores client-side — avoids extra Firestore reads.

**Seeding:** On first login, `DataSeeder.ts` batch-copies `public_recipes`, `public_allergens`, and `public_sideDishes` (global Firestore collections) into the user's private space.

**Batch writes:** `src/utils/firestoreBatch.ts` provides `commitInChunks()` that splits writes into chunks of ≤499 operations to respect Firestore limits.

**Migrations:** `MigrationService.ts` handles schema migrations tracked via `migrationVersion` in the user profile (e.g., v1: `category` string → `categories` array).

### Firestore Structure

```
/public_recipes          # Shared seed data
/public_allergens        # Shared allergens
/public_sideDishes       # Shared side dishes
/users/{uid}/
  ├── profile/data       # isInitialized, migrationVersion
  ├── recipes            # User's recipes
  ├── meals              # User's meals
  ├── allergens          # User's allergens
  ├── sideDishes         # User's side dishes
  ├── participants       # User's participants/guests
  ├── shoppingItems      # Shopping list
  └── pantryItems        # Pantry items
```

### Key Directories

| Path | Purpose |
|------|---------|
| `src/composables/` | Reusable composition logic; `useFirebaseCollection.ts` is the backbone |
| `src/stores/` | Pinia stores — one per Firestore collection |
| `src/services/` | Business logic: AI, menu generation, seeding, images, sharing, migrations |
| `src/models/` | TypeScript interfaces for all domain entities |
| `src/views/` | Route-level page components |
| `src/components/` | Reusable UI components organized by feature |
| `src/utils/` | Pure helpers: dates, sorting, hydration, batch ops, categories |

### Composables

| File | Purpose |
|------|---------|
| `useFirebaseCollection.ts` | Generic Firestore CRUD + real-time listeners — backbone of all stores |
| `useTheme.ts` | Dark/light mode toggle via `.dark` class + localStorage |
| `useAppConfirm.ts` | Global confirmation dialog with reactive state |
| `useWakeLock.ts` | Screen Wake Lock API — prevents screen sleep during cooking |
| `useCookingTimer.ts` | Multiple concurrent timers with audio beep + vibration + localStorage |
| `useCookingMode.ts` | Cooking session: step parsing, ingredient matching, timer coordination, wake lock |
| `useNotify.ts` | Toast notifications (success/error/warn) via PrimeVue |
| `useMealActions.ts` | Meal operations: generation, swap, move, status, deletion, attendee assignment |
| `useMealsPlanningData.ts` | Computed planning data: hydration, date grouping, filtering |

### Stores

All stores follow this pattern — use it when adding a new one:

```ts
export const useXxxStore = defineStore('xxx', () => {
  const { items, isLoading, isReady, error, addItem, updateItem, deleteItem } =
    useFirebaseCollection<Xxx>('xxxCollection')
  // domain-specific computed/actions on top
  return { items, isLoading, isReady, error, addItem, updateItem, deleteItem }
})
```

| Store | Notes |
|-------|-------|
| `authStore.ts` | Google/Email login, user space initialization |
| `mealStore.ts` | Batch saving with `commitInChunks` |
| `recipeStore.ts` | Simple wrapper |
| `allergenStore.ts` | Simple wrapper |
| `participantStore.ts` | Simple wrapper |
| `sideDishStore.ts` | Simple wrapper |
| `shoppingStore.ts` | Batch add, clear checked/all items |
| `pantryStore.ts` | Transfer selected items to shopping list |

Stores are **all initialized in `App.vue` on mount** so their real-time listeners start before any view renders — do not lazy-initialize stores in individual views.

### Services

| Service | Purpose |
|---------|---------|
| `GeminiService.ts` | AI recipe analysis (Gemini 2.5 Flash, client-side) — intentional, stays on Firebase Spark (free) plan |
| `MenuGeneratorEngine.ts` | Smart menu generation: allergen filtering, scoring, repetition avoidance |
| `ImageService.ts` | Canvas-based compression to WebP (max 500px, quality 0.7, 750KB limit) |
| `RecipeShareService.ts` | Web Share API or clipboard — payload Base64-encoded in URL |
| `DataSeeder.ts` | Batch-copies public collections into user's private space on first login |
| `MigrationService.ts` | Schema migrations tracked via `migrationVersion` in user profile |

### Models

| Model | Key Fields |
|-------|-----------|
| `Recipe.ts` | ingredients, allergenIds, sideDishIds, categories (string[]), prepTime, rating, imageUrl |
| `Meal.ts` | date (YYYY-MM-DD), type (Lunch/Dinner/…), status, recipeId, attendeeIds, selectedSideDishIds, order |
| `Participant.ts` | name, allergyIds, photoUrl, isActive |
| `Allergen.ts` | id, name |
| `SideDish.ts` | id, name |
| `ShoppingItem.ts` | name, details, checked, source ('recipe'/'manual'/'pantry') |
| `PantryItem.ts` | name, category, selected, order |

### Views & Routes

| View | Route | Purpose |
|------|-------|---------|
| `LoginView.vue` | `/login` | Google + Email auth |
| `MealsView.vue` | `/meals` | Calendar planning, AI generation, meal actions |
| `MealDetailView.vue` | `/meals/:id` | Meal detail: recipe, participants, sides |
| `CookingModeView.vue` | `/cooking/:recipeId` | Full-screen cooking: steps, timers, wake lock |
| `RecipesView.vue` | `/recipes` | Recipe list/grid |
| `RecipeFormView.vue` | `/recipes/new`, `/recipes/:id` | Create/edit recipe with AI import |
| `ImportRecipeView.vue` | `/import` | Import shared recipe from Base64 URL |
| `ShoppingListView.vue` | `/shopping-list` | Shopping list + pantry transfer |
| `SettingsView.vue` | `/settings` | Participants, allergens, side dishes tabs |
| `AdminView.vue` | `/admin` | DB seeding, user management (VITE_ADMIN_EMAIL gated) |

Navigation guards in `src/router/index.ts` wait for auth initialization before resolving routes.

### Utilities

| Utility | Purpose |
|---------|---------|
| `hydrateMeal.ts` | `hydrateMeal()` — joins meal IDs with full objects from stores |
| `firestoreBatch.ts` | `commitInChunks()` — splits writes into ≤499-op chunks |
| `dateUtils.ts` | `getLocalISODate()`, `formatDateLabel()` — timezone-aware, FR locale |
| `sortUtils.ts` | `sortByNameFr()` — French-aware alphabetical sort (accent-insensitive) |
| `mealUtils.ts` | `cleanForFirestore()` — strips undefined fields before writes |
| `cookingParser.ts` | Parses recipe instructions: steps, ingredient matches, timers |
| `categoryUtils.ts` | `getCategoryColor()` — maps recipe categories to Tailwind color classes |

### Theme

Dark/light mode is managed by `useTheme.ts` via the `.dark` CSS class selector (Tailwind). PrimeVue uses the Aura preset; custom tokens are defined in `tailwind.config.js`.

## Environment Variables

Required in `.env.local`:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_GEMINI_API_KEY
VITE_ADMIN_EMAIL
```
