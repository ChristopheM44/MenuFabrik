import Foundation

struct AllergenDTO: Codable {
    let name: String
}

struct SideDishDTO: Codable {
    let name: String
}

struct RecipeDTO: Codable {
    let name: String
    let prepTime: Int
    let mealType: String
    let category: String
    let allergens: [String]
    let requiresFreeTime: Bool
    let suggestedSides: [String]
    let rating: Int
    let instructions: String?
}

struct ParticipantDTO: Codable {
    let name: String
    let isActive: Bool
    let allergies: [String]
}

struct MealDTO: Codable {
    let date: Date
    let type: String
    let status: String
    let recipeName: String?
    let selectedSideDishes: [String]
}



struct AppDataExport: Codable {
    let version: Int
    let allergens: [AllergenDTO]
    let sideDishes: [SideDishDTO]
    let recipes: [RecipeDTO]
    let participants: [ParticipantDTO]
    let meals: [MealDTO]
}
