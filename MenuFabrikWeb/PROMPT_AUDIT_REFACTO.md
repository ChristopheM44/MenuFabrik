# Audit de Sécurité & Refactoring Global - MenuFabrik Web

Salut Antigravity ! 
Dans la session précédente, nous avons complété la **Phase 7** en migrant notre application vers une architecture **Multi-tenant de Production** avec **Firebase Authentication**.

Avant d'ajouter de nouvelles fonctionnalités (Phase 8), je souhaite marquer une pause technique. L'objectif de cette session est de réaliser un audit de sécurité complet et un refactoring de la base de code existante pour garantir la robustesse, la maintenabilité et l'inviolabilité de l'application.

Voici mon plan détaillé que je souhaite que tu analyses puis que tu exécutes, étape par étape :

## 1. Audit de Sécurité Firebase (Architecture & Règles)
- **Vérification des `firestore.rules`** : Analyse nos règles actuelles. Sont-elles totalement à l'épreuve des balles ? Existe-t-il des failles potentielles permettant à un utilisateur (même malveillant via l'API) de modifier le `/profile` d'un autre utilisateur, de contourner la lecture de `public_recipes`, ou d'injecter des données corrompues ? Propose un durcissement si nécessaire (ex: validation des schémas de données directement dans les règles).
- **Sécurisation côté Client** : Assure-toi que les appels Firebase (dans nos Stores Pinia ou nos Services) gèrent correctement les erreurs d'autorisation sans faire crasher l'application et sans divulguer d'informations sensibles dans la console.

## 2. Refactoring des Stores Pinia & Gestion d'État
- **Code Dupliqué** : Nous avons actuellement 5 stores (`recipeStore`, `mealStore`, `participantStore`, `allergenStore`, `sideDishStore`) qui partagent une architecture presque identique (Listeners temps réel, CRUD Firebase, fallback UID).
  - Propose une abstraction ou un composable réutilisable (ex: `useFirebaseCollection(collectionName)`) pour factoriser ces 300 lignes de code redondantes.
- **Optimisation des Listeners** : Vérifie que le montage/démontage des listeners Firestore (`onSnapshot`) lors des changements de composants ou de la déconnexion (`$reset`) n'entraîne aucune fuite de mémoire (memory leak).

## 3. Nettoyage de l'UI & Architecture des Composants (Vue 3)
- **Composants PrimeVue** : Analyse l'utilisation de PrimeVue dans nos vues (notamment `RecipeFormView`, `SettingsView`, `MealDetailView`). L'intégration avec TailwindCSS est-elle toujours optimale ? Y a-t-il des props obsolètes ou des warnings dans la console ?
- **Gestion des Modales/Dialogues** : Uniformiser la manière dont nous affichons les boîtes de dialogue de suppression (`ConfirmDialog` de PrimeVue) à travers l'application.
- **Clean Architecture** : Transférer la logique métier lourde (qui serait encore présente dans les fichiers `.vue`) vers des services dédiés (`src/services/`) pour que les composants ne gèrent que l'affichage et les inputs.

## 4. Performance & UX
- Vitesse de chargement : Le build Vite actuel produit-il des chunks trop lourds ? Propose du Lazy Loading pour les routes Vue Router si ce n'est pas déjà le cas.
- Amélioration de l'expérience du Loader d'initialisation (lorsque le Seeder peuple le compte d'un nouvel utilisateur).

### Action requise de ta part :
1. Confirme ta compréhension de cet audit.
2. Commence par inspecter les fichiers `firestore.rules`, `src/stores/*`, et `src/router/index.ts`.
3. Propose-moi un `implementation_plan.md` détaillé avec les failles trouvées et les refactorings proposés avant d'écrire la moindre ligne de code.
