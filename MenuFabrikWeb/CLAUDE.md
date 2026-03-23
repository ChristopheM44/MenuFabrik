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

**MenuFabrikWeb** is a Vue 3 PWA for family meal planning. It allows planning meals on a weekly calendar, managing a recipe database, and generating shopping lists. Features AI-powered recipe import via Google Gemini.

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

### Key Directories

| Path | Purpose |
|------|---------|
| `src/composables/` | Reusable composition logic; `useFirebaseCollection.ts` is the backbone |
| `src/stores/` | Pinia stores — one per Firestore collection |
| `src/services/` | Business logic: `GeminiService.ts` (AI), `MenuGeneratorEngine.ts`, `DataSeeder.ts`, `ImageService.ts`, `RecipeShareService.ts` |
| `src/models/` | TypeScript interfaces for all domain entities |
| `src/views/` | Route-level page components |
| `src/components/` | Reusable UI components (layout, settings, recipes) |
| `src/utils/` | Pure helpers: dates, sorting, hydration, batch ops |

### Store Pattern

All stores follow this structure — use it when adding a new one:

```ts
export const useXxxStore = defineStore('xxx', () => {
  const { items, isLoading, isReady, error, addItem, updateItem, deleteItem } =
    useFirebaseCollection<Xxx>('xxxCollection')
  // domain-specific computed/actions on top
  return { items, isLoading, isReady, error, addItem, updateItem, deleteItem }
})
```

Stores are **all initialized in `App.vue` on mount** so their real-time listeners start before any view renders — do not lazy-initialize stores in individual views.

### Router

Navigation guards in `src/router/index.ts` wait for auth initialization before resolving routes. Unauthenticated users are redirected to `/login`. The `/admin` route is gated by the `VITE_ADMIN_EMAIL` env variable.

### AI Integration

`GeminiService.ts` calls the Gemini 2.5 Flash API **client-side** (not via Cloud Functions). This is intentional to stay on the Firebase Spark (free) plan.

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
