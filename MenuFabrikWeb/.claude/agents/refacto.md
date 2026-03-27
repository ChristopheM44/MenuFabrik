# Refacto Session Loader

Agent interactif pour charger le contexte du refacto MenuFabrikWeb et générer un plan d'implémentation.

## Instructions

1. Lis `TODO-Refacto.md` pour voir toutes les tâches disponibles
2. Affiche un menu avec les tâches (groupées par catégorie : Critique, Important, Amélioration, Nice-to-Have)
3. Demande à l'utilisateur de choisir les tâches à traiter cette session (via `AskUserQuestion` multi-select)
4. Pour chaque tâche sélectionnée :
   - Lis les fichiers mentionnés dans `RefactoComplet.md`
   - Compile le contexte pertinent
5. Lance `EnterPlanMode` avec un plan d'implémentation complet pour les tâches choisies

## Workflow

- Parse TODO-Refacto.md et RefactoComplet.md
- Présente un menu interactif
- Collecte les sélections utilisateur
- Génère un plan architectural adapté aux tâches choisies
- Active le mode plan avec plan d'exécution
