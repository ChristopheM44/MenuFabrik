import Foundation

/// Moteur de génération pur, totalement découplé de la persistance de SwiftData (ModelContext).
/// L'objectif est de le rendre 100% testable unitairement en lui passant uniquement des tableaux d'objets.
struct MenuGeneratorEngine {
    
    /// Assigne des recettes à une liste de repas pour une semaine complète, en respectant les règles d'allergies et de diversité.
    static func generateMenu(for meals: [Meal], availableRecipes: [Recipe], participants: [Participant]) {
        // 1. Extraire toutes les allergies à éviter
        let excludedAllergens = Set(participants.flatMap { $0.allergies.map { $0.lowercased() } })
        
        // 2. Filtrer les recettes sûres
        let safeRecipes = availableRecipes.filter { recipe in
            let recipeAllergens = Set(recipe.allergens.map { $0.lowercased() })
            return recipeAllergens.isDisjoint(with: excludedAllergens)
        }
        
        // 3. Trier les repas chronologiquement (Midi avant le soir)
        let sortedMeals = meals.sorted {
            if Calendar.current.isDate($0.date, inSameDayAs: $1.date) {
                return $0.type == .lunch && $1.type == .dinner
            }
            return $0.date < $1.date
        }
        
        var usedRecipeIDs: Set<UUID> = []
        var previousCategory: RecipeCategory? = nil
        
        for meal in sortedMeals {
            // Ignorer la génération pour les repas non planifiés
            guard meal.status == .planned else { continue }
            
            let expectedType: MealType = (meal.type == .lunch) ? .lunch : .dinner
            let isWeekend = Calendar.current.isDateInWeekend(meal.date)
            
            var candidates = safeRecipes.filter { $0.mealType == .both || $0.mealType == expectedType }
            
            // Règle du temps libre: Exclure les plats longs en semaine
            if !isWeekend {
                candidates = candidates.filter { !$0.requiresFreeTime }
            }
            
            // Règle de temps: Privilégier les recettes rapides pour le midi (< 30 min)
            if meal.type == .lunch {
                let fastCandidates = candidates.filter { $0.prepTime <= 30 }
                if !fastCandidates.isEmpty { candidates = fastCandidates }
            }
            
            // Règle de diversité 1: Ne pas manger deux fois la même recette dans la semaine
            let unseenCandidates = candidates.filter { !usedRecipeIDs.contains($0.id) }
            if !unseenCandidates.isEmpty { candidates = unseenCandidates }
            
            // Règle de diversité 2: Ne pas manger la même catégorie deux repas de suite
            if let prevCat = previousCategory {
                let diffCatCandidates = candidates.filter { $0.category != prevCat }
                if !diffCatCandidates.isEmpty { candidates = diffCatCandidates }
            }
            
            // Sélection aléatoire
            guard let chosenRecipe = candidates.randomElement() else {
                print("Alerte: Pas assez de recettes compatibles pour le \(meal.date) - \(meal.type.rawValue)")
                continue
            }
            
            meal.recipe = chosenRecipe
            meal.selectedSideDish = chosenRecipe.suggestedSides.randomElement()
            usedRecipeIDs.insert(chosenRecipe.id)
            previousCategory = chosenRecipe.category
        }
    }
    
    /// Trouve une recette alternative pour un seul repas, en évitant les recettes déjà présentes dans l'historique de la semaine.
    static func generateAlternative(for meal: Meal, availableRecipes: [Recipe], participants: [Participant], history: [Meal]) {
        guard meal.status == .planned else { return }
        
        let currentRecipe = meal.recipe
        let excludedAllergens = Set(participants.flatMap { $0.allergies.map { $0.lowercased() } })
        
        let safeRecipes = availableRecipes.filter { recipe in
            let recipeAllergens = Set(recipe.allergens.map { $0.lowercased() })
            return recipeAllergens.isDisjoint(with: excludedAllergens)
        }
        
        let usedRecipeIDs = Set(history.compactMap { $0.recipe?.id })
        let expectedType: MealType = (meal.type == .lunch) ? .lunch : .dinner
        let isWeekend = Calendar.current.isDateInWeekend(meal.date)
        
        var candidates = safeRecipes.filter { $0.mealType == .both || $0.mealType == expectedType }
        
        // Règle du temps libre: Exclure les plats longs en semaine
        if !isWeekend {
            candidates = candidates.filter { !$0.requiresFreeTime }
        }
        
        // Exclure la recette actuelle
        if let current = currentRecipe {
            candidates.removeAll { $0.id == current.id }
        }
        
        // Exclure celles déjà dans la semaine
        let unseenCandidates = candidates.filter { !usedRecipeIDs.contains($0.id) }
        if !unseenCandidates.isEmpty { candidates = unseenCandidates }
        
        guard let chosenRecipe = candidates.randomElement() else {
            print("Impossible de trouver une alternative pour le repas.")
            return
        }
        
        meal.recipe = chosenRecipe
        meal.selectedSideDish = chosenRecipe.suggestedSides.randomElement()
    }
}
