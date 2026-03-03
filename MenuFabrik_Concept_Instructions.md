# MenuFabrik - Concept et Instructions pour Antigravity

## 🎯 Le Concept (L'esprit de l'App)
MenuFabrik est un générateur intelligent de menus de la semaine, fortement inspiré d'applications comme JOW. L'objectif principal est de réduire la charge mentale liée à la question "Qu'est-ce qu'on mange ?". 

Le cœur de la valeur ajoutée réside dans son **moteur de génération** qui doit être intelligent : il doit prendre en compte les contraintes du foyer (allergies, régimes) plat par plat (gestion dynamique des présences), et assurer une diversité alimentaire (ne pas manger de pâtes deux fois de suite, privilégier le rapide à midi). Le projet a évolué vers un modèle d'Agenda Hybride Continu, s'affranchissant du carcan de "semaine stricte".

L'application est fondamentalement **Multiplateforme Apple (iOS, iPadOS, macOS)**. Son interface doit donc être réactive et s'adapter au support de l'utilisateur (ex: affichage en grille sur Mac/iPad, mais en liste classique sur iPhone).

## 🛠 Choix Techniques Fondamentaux
1. **Langage & UI** : Swift et SwiftUI (100%).
2. **Architecture** : MVVM adapté au contexte SwiftData. La UI doit rester le plus bête possible (déclarative).
3. **Persistance des données** : SwiftData (local d'abord).
4. **Clean Code & Tests** : La logique métier (l'algorithme de génération) doit être découplée de la couche de persistance pour être facilement testable unitairement basées sur des *Value Types*.

## 🔑 Modèles Cœurs (Core Entities)
- `Participant` : Un membre de la famille. Possède un prénom, un état actif/inactif (participe au menu ?) et une liste d'allergies/régimes.
- `Recipe` : Une recette. Nom, temps de préparation, moment (Midi/Soir), catégorie (Pâtes, Viande, etc.), une note sur 5, et des allergènes.
  - **Intelligence (`requiresFreeTime`)** : Tag boolean signalant un plat de Week-end/Vacances vs plat de semaine.
  - **Accompagnements (`suggestedSides`)** : Liste d'accompagnements possibles pour ce plat.
- `Meal` : Un repas unique généré, inséré dans l'**Agenda Continu**.
  - `status` (`MealStatus`) : Prévu, Restaurant, Au Travail, Absent.
  - `recipe` : Référence optionnelle vers la Recette choisie.
  - `selectedSideDishes` : Liste d'accompagnements tirés au sort pour ce repas.
  - `attendees` : Liste des participants prévus pour ce repas précis. L'intelligence du générateur se base sur ces présences pour proposer des plats compatibles (gestion fine des allergies à l'échelle du repas).

## 🔐 Authentification & Multi-Comptes (Multi-tenant & Sécurité)
- L'application Web (Vue.js + Firebase) gère l'**Authentification** (e-mail/mot de passe ou SSO Google).
- Chaque "Compte" (Foyer) possède sa propre base de données hermétique (`users/{userId}/*`).
- **Règles de Sécurité Firestore** : Les règles sont strictement verrouillées par l'ID utilisateur (`isOwner`). Une validation de schéma est appliquée (ex: le champ `name` est obligatoire, taille de payload max 50Ko) pour empêcher toute corruption de données.
- **Architecture Pinia (Vue 3)** : La gestion d'état locale s'appuie sur le composable générique fortement typé `useFirebaseCollection(collectionName)`. Cela factorise le CRUD complet (fetch, ajouts, modification, listeners temps-réel `onSnapshot`) tout en garantissant aucune fuite de mémoire à la déconnexion. Les stores spécifiques (Recettes, Menu, etc.) ne font que consommer ce composable DRY.

## 🚨 Règles pour Antigravity (Directives de développement)
1. **Séparation des préoccupations (SoC)** : Ne jamais mélanger la logique complexe de sélection de recette à l'intérieur d'une Vue SwiftUI. Les vues SwiftUI ne font que l'affichage et appellent des services / ViewModels.
2. **Architecture du Générateur** : L'algorithme se trouve dans `MenuGeneratorEngine` (pure function, aucune dépendance à `ModelContext`). Le `MenuGeneratorService` n'est qu'une façade (repository) qui charge les données et appelle l'Engine.
3. **L'UI au service du beau (Aesthetics)** : Ne laissez pas l'interface devenir un banal formulaire. Intégrez des symboles SF, des micro-animations, et un design clair. Les vues complexes nécessitent d'être découpées en sous-composants (ex: `MealCardView`).
4. **Résilience et Sécurité** : Les opérations de génération ne doivent pas bloquer le thread principal (`@MainActor` / `async`) si cela devient lourd. Toujours gérer les cas où aucune recette n'est disponible.
5. **Fixtures et Mocking** : Toujours maintenir le `DataSeeder` à jour avec le modèle pour faciliter l'onboarding et les tests manuels.
6. **Thématisation & Dark Mode (Vue Web)** : Pour les composants PrimeVue, l'application utilise le système de design et les variables sémantiques primitives (Aura). Cependant, pour les balises HTML standards et conteneurs n'appartenant pas à PrimeVue, les variables `surface-*` ne s'inversent **pas** automatiquement dans Tailwind. Par conséquent, **il est obligatoire** d'utiliser les modificateurs Tailwind `dark:` de façon explicite (ex: `bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0`). Lorsque vous créez de nouvelles vues à l'avenir, n'hésitez pas à envelopper les parties non-gérées par PrimeVue avec une déclaration type : `bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0`.

## 🗂 Structure du Projet Web (Vue 3 + Firebase)

Le projet web est situé dans `MenuFabrikWeb/`. La racine applicative est `src/`.

```
MenuFabrikWeb/
├── src/
│   ├── models/            # Types TypeScript purs (interfaces)
│   │   ├── Meal.ts        # Meal, MealStatus (PLANNED, RESTAURANT, ABSENT…), MealTime
│   │   ├── Recipe.ts      # Recipe avec category, allergens, prepTime, rating…
│   │   ├── Participant.ts # Participant avec isActive, allergenIds
│   │   ├── Allergen.ts
│   │   └── SideDish.ts
│   │
│   ├── stores/            # Pinia stores — consomment useFirebaseCollection
│   │   ├── authStore.ts   # Auth Firebase, setupAuthListener, isUserDbInitialized
│   │   ├── mealStore.ts   # meals + saveMealsBatch (opération batch Firestore)
│   │   ├── recipeStore.ts
│   │   ├── participantStore.ts
│   │   ├── allergenStore.ts
│   │   └── sideDishStore.ts
│   │
│   ├── composables/
│   │   ├── useFirebaseCollection.ts  # Composable générique CRUD + onSnapshot (DRY)
│   │   └── useTheme.ts               # Toggle dark/light mode
│   │
│   ├── services/
│   │   ├── MenuGeneratorEngine.ts    # Algorithme de génération (logique pure, sans dépendance Firebase)
│   │   ├── GeminiService.ts          # Intégration IA Gemini (import de recettes, liste de courses)
│   │   ├── RecipeShareService.ts     # Partage/import de recettes via URL
│   │   └── DataSeeder.ts             # Peuplement initial Firestore à la création d'un compte
│   │
│   ├── views/             # Pages principales (une URL = une vue)
│   │   ├── MealsView.vue         # Agenda & Menu — vue principale /meals
│   │   ├── MealDetailView.vue    # Détail d'un repas /meals/:id
│   │   ├── RecipesView.vue       # Liste des recettes /recipes
│   │   ├── RecipeFormView.vue    # Création/édition d'une recette /recipes/new|:id
│   │   ├── ImportRecipeView.vue  # Import de recette via IA /recipes/import
│   │   ├── ShoppingListView.vue  # Liste de courses /shopping-list
│   │   ├── SettingsView.vue      # Paramètres (participants, allergènes, accompagnements) /settings
│   │   └── LoginView.vue         # Authentification /login
│   │
│   ├── components/
│   │   ├── MealCardView.vue           # Carte repas dans l'agenda (squelette, planifié, statut)
│   │   ├── layout/
│   │   │   ├── AppLayout.vue          # Layout global (sidebar desktop + nav mobile, ConfirmDialog global)
│   │   │   └── ReloadPrompt.vue       # PWA update prompt
│   │   ├── planning/
│   │   │   └── PlanMealDialog.vue     # Dialog planification (date, durée, participants)
│   │   ├── recipes/
│   │   │   └── RecipeCard.vue
│   │   └── settings/
│   │       ├── SettingsParticipantsTab.vue
│   │       ├── SettingsAllergensTab.vue
│   │       └── SettingsSideDishesTab.vue
│   │
│   ├── firebase/
│   │   └── config.ts      # Init Firebase app + Firestore db
│   └── router/
│       └── index.ts       # Routes Vue Router (toutes protégées par guard auth sauf /login)
│
├── functions/             # Cloud Functions Firebase (si utilisées)
├── firestore.rules        # Règles de sécurité Firestore (verrouillage par isOwner)
├── .agents/workflows/     # Workflows Antigravity (/dev, /deploy, /new-view, /new-store)
└── package.json           # Scripts : dev, build, deploy (= build + firebase deploy hosting+firestore)
```

### Conventions importantes

- Toutes les vues utilisent `<script setup lang="ts">` (Composition API).
- Les composants PrimeVue (Button, Dialog, etc.) sont importés **manuellement** dans chaque fichier (pas d'auto-import global).
- Le `<ConfirmDialog>` est instancié **une seule fois** globalement dans `AppLayout.vue` — ne pas l'ajouter dans les vues individuelles.
- La collection Firestore de chaque store est sous `users/{uid}/{collection}` — géré automatiquement par `useFirebaseCollection`.
