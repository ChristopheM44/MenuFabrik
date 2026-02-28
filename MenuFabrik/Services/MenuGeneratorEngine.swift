import Foundation

/// Moteur de génération basé sur un système de Scoring (Pondération) continu.
/// Toujours 100% découplé de la couche de persistance.
struct MenuGeneratorEngine {
    
    /// Assigne des recettes à une liste de repas
    static func generateMenu(for meals: [Meal], availableRecipes: [Recipe], participants: [Participant]) {
        // La logique d'exclusion globale est supprimée, car on gère ça plat par plat désormais
        
        // 3. Trier les repas chronologiquement
        let sortedMeals = meals.sorted {
            if Calendar.current.isDate($0.date, inSameDayAs: $1.date) {
                return $0.type == .lunch && $1.type == .dinner
            }
            return $0.date < $1.date
        }
        
        var usedRecipeIDs: Set<UUID> = []
        var previousCategory: RecipeCategory? = nil
        var previousSideDish: String? = nil
        
        for meal in sortedMeals {
            guard meal.status == .planned else { continue }
            
            let expectedType: MealType = (meal.type == .lunch) ? .lunch : .dinner
            let isWeekend = Calendar.current.isDateInWeekend(meal.date)
            
            // Seulement si le meal n'a pas encore de recette (pour un futur cas où on garde des repas verrouillés)
            guard meal.recipe == nil else { continue }
            
            // 1. Extraire les noms d'allergènes à éviter UNIQUEMENT pour les personnes présentes
            let attendees = meal.attendees ?? participants // Fallback sur tous les participants si `attendees` n'est pas rempli
            let excludedAllergens = Set(attendees.flatMap { $0.allergies.map { $0.name.lowercased() } })
            
            // 2. Filtrer les recettes sûres pour CE repas
            let safeRecipes = availableRecipes.filter { recipe in
                let recipeAllergens = Set(recipe.allergens.map { $0.name.lowercased() })
                return recipeAllergens.isDisjoint(with: excludedAllergens)
            }
            
            // On retient les scores pour chaque recette
            var scoredCandidates: [(recipe: Recipe, score: Int)] = []
            
            for recipe in safeRecipes {
                var score = 0
                
                // --- PÉNALITÉS ROUDHIBITOIRES (ou presque) ---
                if recipe.mealType != .both && recipe.mealType != expectedType {
                    score -= 100
                }
                
                if !isWeekend && recipe.requiresFreeTime {
                    score -= 50
                }
                
                if usedRecipeIDs.contains(recipe.id) {
                    score -= 80  // Diversité: Ne pas remanger la même chose la même semaine
                }
                
                if let prevCat = previousCategory, prevCat == recipe.category {
                    score -= 40  // Diversité: Ne pas manger la même catégorie de suite
                }
                
                // --- BONUS ---
                if meal.type == .lunch && recipe.prepTime <= 30 {
                    score += 20 // Idéal pour le midi
                }
                
                if isWeekend && recipe.requiresFreeTime {
                    score += 15 // C'est le bon moment pour la faire !
                }
                
                scoredCandidates.append((recipe, score))
            }
            
            // Tri décroissant pour avoir le meilleur score en premier
            scoredCandidates.sort { $0.score > $1.score }
            
            // S'il ne reste rien, tant pis, on passe
            guard !scoredCandidates.isEmpty else {
                print("Alerte: Pas de recettes compatibles pour \(meal.date)")
                continue
            }
            
            // On peut prendre aléatoirement parmi le Top 3 pour garder un peu de surprise
            let topScore = scoredCandidates[0].score
            // Les recettes dont le score est proche du top (marge de tolérance)
            let bestCandidates = scoredCandidates.filter { $0.score >= topScore - 10 }.map { $0.recipe }
            let chosenRecipe = bestCandidates.randomElement() ?? scoredCandidates[0].recipe
            
            meal.recipe = chosenRecipe
            
            // Amélioration: Tirage au sort de l'accompagnement (en évitant l'accompagnement précédent)
            var sides = chosenRecipe.suggestedSides
            if let prevSide = previousSideDish, sides.count > 1 {
                sides.removeAll { $0.name.lowercased() == prevSide.lowercased() }
            }
            if let randomSide = sides.randomElement() {
                meal.selectedSideDishes = [randomSide]
                previousSideDish = randomSide.name
            } else {
                meal.selectedSideDishes = []
                previousSideDish = nil
            }
        }
    }
    
    /// Trouve une recette alternative pour un repas unique
    static func generateAlternative(for meal: Meal, availableRecipes: [Recipe], participants: [Participant], history: [Meal]) {
        guard meal.status == .planned else { return }
        
        let attendees = meal.attendees ?? participants
        let excludedAllergens = Set(attendees.flatMap { $0.allergies.map { $0.name.lowercased() } })
        
        let safeRecipes = availableRecipes.filter { recipe in
            let recipeAllergens = Set(recipe.allergens.map { $0.name.lowercased() })
            return recipeAllergens.isDisjoint(with: excludedAllergens)
        }
        
        let expectedType: MealType = (meal.type == .lunch) ? .lunch : .dinner
        let isWeekend = Calendar.current.isDateInWeekend(meal.date)
        let usedRecipeIDs = Set(history.compactMap { $0.recipe?.id })
        let currentRecipeID = meal.recipe?.id
        
        var scoredCandidates: [(recipe: Recipe, score: Int)] = []
        
        for recipe in safeRecipes {
            var score = 0
            
            // Interdiction absolue de reproposer la recette qu'on vient de refuser
            if recipe.id == currentRecipeID {
                continue
            }
            
            if recipe.mealType != .both && recipe.mealType != expectedType {
                score -= 100
            }
            
            if !isWeekend && recipe.requiresFreeTime {
                score -= 50
            }
            
            if usedRecipeIDs.contains(recipe.id) {
                score -= 80
            }
            
            if meal.type == .lunch && recipe.prepTime <= 30 {
                score += 20
            }
            
            if isWeekend && recipe.requiresFreeTime {
                score += 15
            }
            
            scoredCandidates.append((recipe, score))
        }
        
        scoredCandidates.sort { $0.score > $1.score }
        
        guard !scoredCandidates.isEmpty else { return }
        
        let topScore = scoredCandidates[0].score
        let bestCandidates = scoredCandidates.filter { $0.score >= topScore - 10 }.map { $0.recipe }
        let chosenRecipe = bestCandidates.randomElement() ?? scoredCandidates[0].recipe
        
        meal.recipe = chosenRecipe
        if let randomSide = chosenRecipe.suggestedSides.randomElement() {
            meal.selectedSideDishes = [randomSide]
        } else {
            meal.selectedSideDishes = []
        }
    }
}
