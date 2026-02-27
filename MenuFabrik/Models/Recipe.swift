import Foundation
import SwiftData

enum MealType: String, Codable, CaseIterable {
    case lunch = "Midi"
    case dinner = "Soir"
    case both = "Les Deux"
}

enum RecipeCategory: String, Codable, CaseIterable {
    case pasta = "Pâtes"
    case meat = "Viandes"
    case fish = "Poissons"
    case soup = "Soupes"
    case salad = "Salades"
    case fastFood = "Fast Food"
    case vegetarian = "Végétarien"
    case other = "Autre"
}

@Model
final class Recipe {
    var id: UUID = UUID()
    var name: String
    var prepTime: Int // en minutes
    var mealType: MealType
    var category: RecipeCategory
    var allergens: [Allergen]
    var instructions: String
    var rating: Int // De 0 à 5 étoiles
    
    // Nouveaux champs pour l'intelligence
    var requiresFreeTime: Bool
    @Relationship var suggestedSides: [SideDish]
    
    init(name: String, 
         prepTime: Int, 
         mealType: MealType = .both, 
         category: RecipeCategory = .other, 
         allergens: [Allergen] = [], 
         instructions: String = "",
         rating: Int = 0,
         requiresFreeTime: Bool = false,
         suggestedSides: [SideDish] = []) {
        self.name = name
        self.prepTime = prepTime
        self.mealType = mealType
        self.category = category
        self.allergens = allergens
        self.instructions = instructions
        self.rating = rating
        self.requiresFreeTime = requiresFreeTime
        self.suggestedSides = suggestedSides
    }
}
