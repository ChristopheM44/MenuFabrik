import Foundation
import SwiftData

class MenuGeneratorService {
    private let context: ModelContext
    
    init(context: ModelContext) {
        self.context = context
    }
    
    func generate(for menu: WeeklyMenu) {
        // 1. Récupérer les participants actifs et les recettes
        let fetchParticipants = FetchDescriptor<Participant>(predicate: #Predicate { $0.isActive == true })
        let participants = (try? context.fetch(fetchParticipants)) ?? []
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        
        // 2. Extraire toutes les allergies à éviter
        let excludedAllergens = Set(participants.flatMap { $0.allergies.map { $0.lowercased() } })
        
        // 3. Filtrer les recettes sûres (qui n'ont aucun allergène interdit)
        let safeRecipes = allRecipes.filter { recipe in
            let recipeAllergens = Set(recipe.allergens.map { $0.lowercased() })
            return recipeAllergens.isDisjoint(with: excludedAllergens)
        }
        
        // Récupération des repas créés dans WeeklyMenu et on les trie par date
        guard let meals = menu.meals?.sorted(by: {
            if Calendar.current.isDate($0.date, inSameDayAs: $1.date) {
                return $0.type == .lunch && $1.type == .dinner
            }
            return $0.date < $1.date
        }) else { return }
        
        var usedRecipeIDs: Set<UUID> = []
        var previousCategory: RecipeCategory? = nil
        
        for meal in meals {
            // Filtrer par le moment du repas (Midi ou Soir)
            let expectedType: MealType = (meal.type == .lunch) ? .lunch : .dinner
            var candidates = safeRecipes.filter { $0.mealType == .both || $0.mealType == expectedType }
            
            // Règle de temps: Privilégier les recettes rapides pour le midi (< 30 min)
            if meal.type == .lunch {
                let fastCandidates = candidates.filter { $0.prepTime <= 30 }
                if !fastCandidates.isEmpty { candidates = fastCandidates }
            }
            
            // Règle de diversité 1: Ne pas manger deux fois la même recette dans la semaine
            let unseenCandidates = candidates.filter { !usedRecipeIDs.contains($0.id) }
            if !unseenCandidates.isEmpty { candidates = unseenCandidates }
            
            // Règle de diversité 2: Ne pas manger la même catégorie (ex: Pâtes) deux repas de suite
            if let prevCat = previousCategory {
                let diffCatCandidates = candidates.filter { $0.category != prevCat }
                if !diffCatCandidates.isEmpty { candidates = diffCatCandidates }
            }
            
            // Sélection aléatoire parmi les candidats finaux
            guard let chosenRecipe = candidates.randomElement() else {
                print("Alerte: Pas assez de recettes compatibles pour le \(meal.date) - \(meal.type.rawValue)")
                continue
            }
            
            // Assigner et mettre à jour l'historique de la boucle
            meal.recipe = chosenRecipe
            usedRecipeIDs.insert(chosenRecipe.id)
            previousCategory = chosenRecipe.category
        }
        
        // Sauvegarder le context SwiftData
        try? context.save()
    }
    
    func generate(for meal: Meal) {
        // 1. Récupérer le menu parent pour l'historique
        guard let menu = meal.menu else { return }
        let currentRecipe = meal.recipe
        
        let fetchParticipants = FetchDescriptor<Participant>(predicate: #Predicate { $0.isActive == true })
        let participants = (try? context.fetch(fetchParticipants)) ?? []
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        let excludedAllergens = Set(participants.flatMap { $0.allergies.map { $0.lowercased() } })
        
        let safeRecipes = allRecipes.filter { recipe in
            let recipeAllergens = Set(recipe.allergens.map { $0.lowercased() })
            return recipeAllergens.isDisjoint(with: excludedAllergens)
        }
        
        let usedRecipeIDs = Set(menu.meals?.compactMap { $0.recipe?.id } ?? [])
        let expectedType: MealType = (meal.type == .lunch) ? .lunch : .dinner
        
        var candidates = safeRecipes.filter { $0.mealType == .both || $0.mealType == expectedType }
        
        // Exclure la recette actuelle qu'on veut remplacer
        if let current = currentRecipe {
            candidates.removeAll { $0.id == current.id }
        }
        
        // Exclure celles déjà dans le menu de la semaine
        let unseenCandidates = candidates.filter { !usedRecipeIDs.contains($0.id) }
        if !unseenCandidates.isEmpty { candidates = unseenCandidates }
        
        guard let chosenRecipe = candidates.randomElement() else {
            print("Impossible de trouver une alternative pour le repas.")
            return
        }
        
        meal.recipe = chosenRecipe
        try? context.save()
    }
}
