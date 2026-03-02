# MenuFabrik Web (PWA) - Concept et Instructions pour Antigravity

## 🎯 Le Concept (PWA Familiale)
MenuFabrik Web est le portage en PWA (Progressive Web App) de l'application iOS originale. L'objectif reste inchangé : générer intelligemment les menus de la semaine pour réduire la charge mentale ("Qu'est-ce qu'on mange ?").
La nouveauté de cette version **Web** est de permettre une **synchronisation gratuite et en temps réel** entre les différents membres du foyer, peu importe l'appareil (iPhone, iPad, Android, PC), en contournant l'obligation d'un compte Apple Developer payant.

## 🛠 Choix Techniques Fondamentaux
1. **Framework Core** : Vue.js 3 avec l'API de Composition (`<script setup>`).
2. **Langage** : TypeScript (Typer fortement les modèles pour faciliter la migration depuis Swift).
3. **UI & Design** : Tailwind CSS (pour le styling utility-first) + PrimeVue (Aura Theme) pour les composants riches (Modales, Selects, Calendriers).
4. **Authentification & Multi-tenant** : Firebase Auth. Chaque utilisateur (foyer) possède un espace de données isolé sous `/users/{uid}/*` dans Firestore. Lors de la première connexion (inscription), l'application réalise un "Seeding" automatique en clonant des collections publiques (`public_recipes`, etc.) vers l'espace de l'utilisateur.
5. **Gestion d'État & Firebase (State Management)** : Pinia gère l'interface réactive. Une architecture optimisée repose sur un composable `useFirebaseCollection.ts` qui gère génériquement les écouteurs temps réel (onSnapshot) et prévient les fuites de mémoire (Memory Leaks) lors des déconnexions.
6. **Intelligence Artificielle (Gemini)** : L'application intègre Google Gemini (client-side via API Key) pour extraire dynamiquement les ingrédients, les temps de préparation, la catégorie et les instructions depuis un lien web ou du texte brut, avant même de sauvegarder le document en base.
7. **Liste de Courses** : Moteur d'agrégation d'ingrédients local (côté client) qui scanne les repas de l'agenda, additionne les unités similaires et rend une liste claire exportable dans le presse-papier.
8. **Outil de Build & PWA** : Vite + `vite-plugin-pwa` (pour l'installation sur l'écran d'accueil iOS/Android).

## 🔑 Modèles Cœurs (Core Entities)
- `Participant` : Membre de la famille (prénom, allergies, actif/inactif).
- `Recipe` : Nom, temps de prépa, catégorie, note, allergènes, `requiresFreeTime`, `suggestedSideIds`, `instructions`, `ingredients` (tableau `{name, quantity, unit}`).
- `Meal` : Un repas de l'agenda (`date`, `type`, `status`, `recipeId`, `selectedSideDishIds`, `attendeeIds`).
- `SideDish` : Les accompagnements globaux gérés de manière transverse.

## 🚨 Règles pour Antigravity (Directives de développement Web)
1. **Clean Architecture (Vue)** : Séparer la logique métier de l'UI. Les algorithmes de génération, l'IA et l'agrégation de courses ne doivent pas bloquer le rendu visuel.
2. **Utilisation de PrimeVue** : Privilégier systématiquement les composants PrimeVue stylisés avec l'intégration Tailwind plutôt que de recréer des composants complexes depuis zéro. Les modales de confirmation (`ConfirmDialog`) doivent être invoquées globalement.
3. **L'UI au service du beau (Aesthetics)** : Garder un standard de qualité élevé. Utiliser les icônes `PrimeIcons`, des micro-animations CSS, et des Layouts intuitifs (Flexbox/Grid Tailwind). Soigner l'expérience utilisateur (UX) lors des chargements ou erreurs.
4. **Gestion de l'Asynchrone (Firebase)** : Toutes les interactions avec Firebase (Fetch, Update, Add) doivent utiliser la couche de services ou le composable dédié, en gérant proprement les états de chargement (`isLoading`).
5. **Typescript Strict** : Résoudre les avertissements ou erreurs TypeScript dès leur apparition pour ne pas accumuler de dette technique, notamment lors de la manipulation de dates et de structures de données Firebase.
