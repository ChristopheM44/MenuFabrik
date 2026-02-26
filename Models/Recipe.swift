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
    var allergens: [String]
    var instructions: String
    
    init(name: String, 
         prepTime: Int, 
         mealType: MealType = .both, 
         category: RecipeCategory = .other, 
         allergens: [String] = [], 
         instructions: String = "") {
        self.name = name
        self.prepTime = prepTime
        self.mealType = mealType
        self.category = category
        self.allergens = allergens
        self.instructions = instructions
    }
}
