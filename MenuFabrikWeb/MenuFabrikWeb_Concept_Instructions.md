# MenuFabrik Web (PWA) - Concept et Instructions pour Antigravity

## 🎯 Le Concept (PWA Familiale)
MenuFabrik Web est le portage en PWA (Progressive Web App) de l'application iOS originale. L'objectif reste inchangé : générer intelligemment les menus de la semaine pour réduire la charge mentale ("Qu'est-ce qu'on mange ?").
La nouveauté de cette version **Web** est de permettre une **synchronisation gratuite et en temps réel** entre les différents membres du foyer, peu importe l'appareil (iPhone, iPad, Android, PC), en contournant l'obligation d'un compte Apple Developer payant.

## 🛠 Choix Techniques Fondamentaux
1. **Framework Core** : Vue.js 3 avec l'API de Composition (`<script setup>`).
2. **Langage** : TypeScript (Typer fortement les modèles pour faciliter la migration depuis Swift).
3. **UI & Design** : Tailwind CSS (pour le styling utility-first) + PrimeVue (Aura Theme) pour les composants riches (Modales, Selects, Calendriers).
4. **Persistance des données & Synchro** : Firebase (Firestore) remplace SwiftData. Les données sont structurées en mode **Multi-tenant** (`/users/{uid}/*`) pour une isolation totale de chaque foyer.
5. **Authentification** : Firebase Auth (Google Sign-In + Email/Mot de passe) gérée via un `authStore` Pinia de manière globale.
6. **Gestion d'État (State Management)** : Pinia (remplace le `@Environment`) pour gérer l'interface réactive, liée dynamiquement à l'UID de l'utilisateur.
7. **Outil de Build & PWA** : Vite + `vite-plugin-pwa` (pour l'installation sur l'écran d'accueil iOS/Android).

## 🔑 Modèles Cœurs (Core Entities)
- `Participant` : Membre de la famille (prénom, allergies, actif/inactif).
- `Recipe` : Nom, temps de prépa, moment, catégorie, note, allergènes, `requiresFreeTime` (we/vacances), `suggestedSides` (accompagnements).
- `Meal` : Un repas de l'agenda continu (`status`, `recipe`, `selectedSideDishes`, `attendees`).

## 🚨 Règles pour Antigravity (Directives de développement Web)
1. **Clean Architecture (Vue)** : Séparer la logique de l'UI. L'algorithme de génération doit résider dans des fichiers TypeScript purs (ex: `src/services/MenuGeneratorEngine.ts`), sans dépendance directe à Vue ou à l'UI.
2. **Utilisation de PrimeVue** : Privilégier systématiquement les composants PrimeVue (`<Button>`, `<DataTable>`, `<MultiSelect>`, `<Dialog>`) stylisés avec l'intégration Tailwind plutôt que de recréer des composants complexes depuis zéro.
3. **L'UI au service du beau (Aesthetics)** : Garder le standard de qualité du projet natif iOS. Utiliser les icônes `PrimeIcons`, des micro-animations CSS, et des Layouts clairs (Flexbox/Grid Tailwind).
4. **Gestion de l'Asynchrone (Firebase)** : Toutes les interactions avec Firebase (Fetch, Update, Add) doivent être gérées via des Actions Pinia (`async/await`) pour ne pas surcharger les Vues. Gérer proprement les états de chargement (`isLoading`).
5. **Fixtures** : Recréer un équivalent du `DataSeeder.swift` en TypeScript pour injecter un jeu de données de test dans Firebase rapidement lors du développement.
