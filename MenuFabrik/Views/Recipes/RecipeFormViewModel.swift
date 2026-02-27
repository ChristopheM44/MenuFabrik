import SwiftUI
import SwiftData

@Observable
class RecipeFormViewModel {
    var name: String = ""
    var prepTime: Int = 30
    var mealType: MealType = .both
    var category: RecipeCategory = .other
    var instructions: String = ""
    var rating: Int = 0
    var allergens: [Allergen] = []
    
    // Nouveaux champs Phase 5
    var requiresFreeTime: Bool = false
    var suggestedSides: [String] = []
    
    // Le modèle d'origine si on est en édition
    var editingRecipe: Recipe?
    
    var isSaveDisabled: Bool {
        name.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    init(recipe: Recipe? = nil) {
        if let recipe = recipe {
            self.editingRecipe = recipe
            self.name = recipe.name
            self.prepTime = recipe.prepTime
            self.mealType = recipe.mealType
            self.category = recipe.category
            self.instructions = recipe.instructions
            self.allergens = recipe.allergens
            self.rating = recipe.rating
            self.requiresFreeTime = recipe.requiresFreeTime
            self.suggestedSides = recipe.suggestedSides
        }
    }
    
    func save(context: ModelContext) {
        if let recipe = editingRecipe {
            // Modification
            recipe.name = name
            recipe.prepTime = prepTime
            recipe.mealType = mealType
            recipe.category = category
            recipe.instructions = instructions
            recipe.allergens = allergens
            recipe.rating = rating
            recipe.requiresFreeTime = requiresFreeTime
            recipe.suggestedSides = suggestedSides
        } else {
            // Création
            let newRecipe = Recipe(
                name: name,
                prepTime: prepTime,
                mealType: mealType,
                category: category,
                allergens: allergens,
                instructions: instructions,
                rating: rating,
                requiresFreeTime: requiresFreeTime,
                suggestedSides: suggestedSides
            )
            context.insert(newRecipe)
        }
        
        try? context.save()
    }
}
