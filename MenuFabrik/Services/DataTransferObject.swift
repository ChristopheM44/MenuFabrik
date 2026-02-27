import Foundation

struct AllergenDTO: Codable {
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
}

struct ParticipantDTO: Codable {
    let name: String
    let isActive: Bool
    let allergies: [String]
}

struct AppDataExport: Codable {
    let version: Int
    let allergens: [AllergenDTO]
    let recipes: [RecipeDTO]
    let participants: [ParticipantDTO]
}
