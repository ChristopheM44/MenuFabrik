# MenuFabrik - Concept et Instructions pour Antigravity

## 🎯 Le Concept (L'esprit de l'App)
MenuFabrik est un générateur intelligent de menus de la semaine, fortement inspiré d'applications comme JOW. L'objectif principal est de réduire la charge mentale liée à la question "Qu'est-ce qu'on mange ?". 

Le cœur de la valeur ajoutée réside dans son **moteur de génération** qui doit être intelligent : il doit prendre en compte les contraintes du foyer (allergies, régimes) et assurer une diversité alimentaire (ne pas manger de pâtes deux fois de suite, privilégier le rapide à midi).

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
- `Meal` : Un repas unique généré.
  - `status` (`MealStatus`) : Prévu, Restaurant, Au Travail, Absent.
  - `recipe` : Référence optionnelle vers la Recette choisie.
  - `selectedSideDish` : Chaine de caractères (l'accompagnement tiré au sort pour ce repas).
- `WeeklyMenu` : Une période temporelle contenant plusieurs repas.

## 🚨 Règles pour Antigravity (Directives de développement)
1. **Séparation des préoccupations (SoC)** : Ne jamais mélanger la logique complexe de sélection de recette à l'intérieur d'une Vue SwiftUI. Les vues SwiftUI ne font que l'affichage et appellent des services / ViewModels.
2. **Architecture du Générateur** : L'algorithme se trouve dans `MenuGeneratorEngine` (pure function, aucune dépendance à `ModelContext`). Le `MenuGeneratorService` n'est qu'une façade (repository) qui charge les données et appelle l'Engine.
3. **L'UI au service du beau (Aesthetics)** : Ne laissez pas l'interface devenir un banal formulaire. Intégrez des symboles SF, des micro-animations, et un design clair. Les vues complexes nécessitent d'être découpées en sous-composants (ex: `MealCardView`).
4. **Résilience et Sécurité** : Les opérations de génération ne doivent pas bloquer le thread principal (`@MainActor` / `async`) si cela devient lourd. Toujours gérer les cas où aucune recette n'est disponible.
5. **Fixtures et Mocking** : Toujours maintenir le `DataSeeder` à jour avec le modèle pour faciliter l'onboarding et les tests manuels.
