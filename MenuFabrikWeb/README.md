# 🍽️ MenuFabrik Web (PWA)

MenuFabrik est une Progressive Web App (PWA) familiale conçue pour réduire la charge mentale liée à la question récurrente : *"Qu'est-ce qu'on mange ce soir ?"*. 
Née d'une application native iOS, cette version Web permet une **synchronisation en temps réel et multi-plateforme** (iOS, Android, PC) de tous les membres du foyer !

## ✨ Fonctionnalités Principales

- **📅 Planification de Menus (Agenda)** : Génération automatique, aléatoire ou choix manuel de repas pour le midi et le soir. 
- **📖 Carnet de Recettes Intelligent** : Gestion de vos recettes favorites avec support des allergènes personnels et suggestions d'accompagnements.
- **🤖 Assistant IA (Gemini)** : Importez un lien externe ou collez du texte, et laissez Google Gemini extraire avec précision le nom, les ingrédients (avec quantités et unités exactes), le temps de préparation et les étapes essentielles.
- **🛒 Génération de Liste de Courses** : MenuFabrik consolide mathématiquement tous les ingrédients de vos prévisions sur une période donnée pour générer une liste de courses exportable.
- **🔐 Multi-tenant & Sécurité** : Chaque famille possède son propre espace clos dans la base de données. Le système de "Seeding" remplit intelligemment un compte vierge à la première connexion.

---

## 🛠️ Stack Technique

- **Core** : [Vue.js 3](https://vuejs.org/) (Composition API / `<script setup>`)
- **Langage** : [TypeScript](https://www.typescriptlang.org/)
- **State Management** : [Pinia](https://pinia.vuejs.org/)
- **UI & Styling** : [Tailwind CSS](https://tailwindcss.com/) + [PrimeVue](https://primevue.org/) (Aura Theme)
- **Backend as a Service** : [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
- **Tooling & PWA** : [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Intelligence Artificielle** : [SDK Google Gen AI](https://github.com/google/generative-ai-js) (Gemini 2.5 Flash)

---

## 🚀 Démarrage Rapide (Développement Local)

### 1. Prérequis
- `Node.js` (recommandé v18+)
- `npm` ou `yarn`
- Outils Firebase CLI (Optionnel pour le déploiement)

### 2. Installation
Clonez le dépôt ou naviguez dans le sous-dossier de l'application, puis installez les dépendances :
```bash
cd MenuFabrikWeb
npm install
```

### 3. Variables d'Environnement
Créez un fichier `.env.local` à la racine (au même niveau que `vite.config.ts`) et ajoutez-y les variables Firebase utilisees par le front ainsi que la cle API Gemini :

```env
# Configuration Firebase Web App (obligatoire)
VITE_FIREBASE_API_KEY=votre_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

# Clé d'API Google Gemini (obligatoire pour l'assistant IA)
VITE_GEMINI_API_KEY=votre_clef_secrete_ici
```

Ces valeurs Firebase se recuperent dans Firebase Console :
`Project settings` > `General` > `Your apps` > configuration de l'app Web.

### 4. Lancer le serveur local
```bash
npm run dev
```
L'application sera accessible (généralement) sur `http://localhost:5173`.

---

## 📦 Scripts Disponibles

- `npm run dev` : Lance le serveur de développement Vite avec Hot-Module-Replacement (HMR).
- `npm run build` : Applique les vérifications TypeScript (`vue-tsc`) et génère les fichiers statiques de production optimisés dans le dossier `/dist`.
- `npm run preview` : Lance un serveur local pour tester le `/dist` généré avant déploiement.

---

## ☁️ Déploiement en Production

MenuFabrikWeb est configuré pour être déployé sur **Firebase Hosting**.

Vérifiez que vous êtes authentifié sur Firebase CLI :
```bash
npx firebase login
```

Lancez la commande de build combinee au deploiement (assurez-vous que le projet Firebase vise est correct avec `npx firebase use`) :
```bash
npm run build && npx firebase deploy --only hosting
```

---

## 🏗 Architecture & Codebase

- `/src/models` : Interfaces TypeScript décrivant les entités métiers (`Recipe`, `Meal`, `Participant`...).
- `/src/stores` : Les Pinia Stores orchestrent l'interaction asynchrone avec Firebase et gèrent le cache local.
- `/src/composables` : Logique Vue partagée, dont l'important `useFirebaseCollection` pour la synchronisation Firestore RT multi-tenant sans redondance.
- `/src/views` : Les composants pages "Roots" associés au Vue Router (`MealsView.vue`, `ShoppingListView.vue`...).
- `/src/components` : Petits composants UI réutilisables ou d'agencement.

*(Voir l'historique d'audit et `MenuFabrikWeb_Concept_Instructions.md` pour les tenants/aboutissants architecturaux approfondis)*.
