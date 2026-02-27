import Foundation
import SwiftData

@MainActor
class DataExportService {
    let context: ModelContext
    
    init(context: ModelContext) {
        self.context = context
    }
    
    func exportData() throws -> Data {
        let allergens = (try? context.fetch(FetchDescriptor<Allergen>())) ?? []
        let recipes = (try? context.fetch(FetchDescriptor<Recipe>())) ?? []
        let participants = (try? context.fetch(FetchDescriptor<Participant>())) ?? []
        
        let exportData = AppDataExport(
            version: 1,
            allergens: allergens.map { AllergenDTO(name: $0.name) },
            recipes: recipes.map { recipe in
                RecipeDTO(
                    name: recipe.name,
                    prepTime: recipe.prepTime,
                    mealType: recipe.mealType.rawValue,
                    category: recipe.category.rawValue,
                    allergens: recipe.allergens.map { $0.name },
                    requiresFreeTime: recipe.requiresFreeTime,
                    suggestedSides: recipe.suggestedSides,
                    rating: recipe.rating
                )
            },
            participants: participants.map { p in
                ParticipantDTO(
                    name: p.name,
                    isActive: p.isActive,
                    allergies: p.allergies.map { $0.name }
                )
            }
        )
        
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        return try encoder.encode(exportData)
    }
    
    func importData(from data: Data) throws {
        let decoder = JSONDecoder()
        let imported = try decoder.decode(AppDataExport.self, from: data)
        
        guard imported.version == 1 else {
            throw NSError(domain: "DataExportService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Version de données non supportée"])
        }
        
        // Nettoyage via boucle pour compatibilité
        let oldAllergens = (try? context.fetch(FetchDescriptor<Allergen>())) ?? []
        for a in oldAllergens { context.delete(a) }
        
        let oldRecipes = (try? context.fetch(FetchDescriptor<Recipe>())) ?? []
        for r in oldRecipes { context.delete(r) }
        
        let oldParticipants = (try? context.fetch(FetchDescriptor<Participant>())) ?? []
        for p in oldParticipants { context.delete(p) }
        
        let oldMeals = (try? context.fetch(FetchDescriptor<Meal>())) ?? []
        for m in oldMeals { context.delete(m) }
        
        let oldMenus = (try? context.fetch(FetchDescriptor<WeeklyMenu>())) ?? []
        for m in oldMenus { context.delete(m) }
        
        var allergenMap: [String: Allergen] = [:]
        
        for aDTO in imported.allergens {
            let a = Allergen(name: aDTO.name)
            context.insert(a)
            allergenMap[a.name] = a
        }
        
        for rDTO in imported.recipes {
            let r = Recipe(
                name: rDTO.name,
                prepTime: rDTO.prepTime,
                mealType: MealType(rawValue: rDTO.mealType) ?? .both,
                category: RecipeCategory(rawValue: rDTO.category) ?? .other,
                allergens: rDTO.allergens.compactMap { allergenMap[$0] },
                requiresFreeTime: rDTO.requiresFreeTime,
                suggestedSides: rDTO.suggestedSides
            )
            r.rating = rDTO.rating
            context.insert(r)
        }
        
        for pDTO in imported.participants {
            let p = Participant(
                name: pDTO.name,
                isActive: pDTO.isActive,
                allergies: pDTO.allergies.compactMap { allergenMap[$0] }
            )
            context.insert(p)
        }
        
        try context.save()
    }
}
