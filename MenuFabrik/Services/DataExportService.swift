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
        let sideDishes = (try? context.fetch(FetchDescriptor<SideDish>())) ?? []
        let recipes = (try? context.fetch(FetchDescriptor<Recipe>())) ?? []
        let participants = (try? context.fetch(FetchDescriptor<Participant>())) ?? []
        let meals = (try? context.fetch(FetchDescriptor<Meal>())) ?? []
        
        let exportData = AppDataExport(
            version: 1,
            allergens: allergens.map { AllergenDTO(name: $0.name) },
            sideDishes: sideDishes.map { SideDishDTO(name: $0.name) },
            recipes: recipes.map { recipe in
                RecipeDTO(
                    name: recipe.name,
                    prepTime: recipe.prepTime,
                    mealType: recipe.mealType.rawValue,
                    category: recipe.category.rawValue,
                    allergens: recipe.allergens.map { $0.name },
                    requiresFreeTime: recipe.requiresFreeTime,
                    suggestedSides: recipe.suggestedSides.map { $0.name },
                    rating: recipe.rating,
                    instructions: recipe.instructions
                )
            },
            participants: participants.map { p in
                ParticipantDTO(
                    name: p.name,
                    isActive: p.isActive,
                    allergies: p.allergies.map { $0.name }
                )
            },
            meals: meals.map { meal in
                MealDTO(
                    date: meal.date,
                    type: meal.type.rawValue,
                    status: meal.status.rawValue,
                    recipeName: meal.recipe?.name,
                    selectedSideDishes: meal.selectedSideDishes.map { $0.name }
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
        
        let oldSides = (try? context.fetch(FetchDescriptor<SideDish>())) ?? []
        for s in oldSides { context.delete(s) }
        
        let oldMeals = (try? context.fetch(FetchDescriptor<Meal>())) ?? []
        for m in oldMeals { context.delete(m) }
        
        var allergenMap: [String: Allergen] = [:]
        
        for aDTO in imported.allergens {
            let a = Allergen(name: aDTO.name)
            context.insert(a)
            allergenMap[a.name] = a
        }
        
        var sideMap: [String: SideDish] = [:]
        for sDTO in imported.sideDishes {
            let s = SideDish(name: sDTO.name)
            context.insert(s)
            sideMap[s.name] = s
        }
        
        let allUniqueRecipeSides = Set(imported.recipes.flatMap { $0.suggestedSides })
        for sName in allUniqueRecipeSides {
            if sideMap[sName] == nil {
                let s = SideDish(name: sName)
                context.insert(s)
                sideMap[sName] = s
            }
        }
        
        for rDTO in imported.recipes {
            let r = Recipe(
                name: rDTO.name,
                prepTime: rDTO.prepTime,
                mealType: MealType(rawValue: rDTO.mealType) ?? .both,
                category: RecipeCategory(rawValue: rDTO.category) ?? .other,
                allergens: rDTO.allergens.compactMap { allergenMap[$0] },
                requiresFreeTime: rDTO.requiresFreeTime,
                suggestedSides: rDTO.suggestedSides.compactMap { sideMap[$0] }
            )
            r.rating = rDTO.rating
            if let instructions = rDTO.instructions {
                r.instructions = instructions
            }
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
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        var recipeMap: [String: Recipe] = [:]
        for r in allRecipes { recipeMap[r.name] = r }
        
        let fetchParticipants = FetchDescriptor<Participant>()
        let allParticipants = (try? context.fetch(fetchParticipants)) ?? []
        
        for mDTO in imported.meals {
            let m = Meal(
                date: mDTO.date,
                type: MealTime(rawValue: mDTO.type) ?? .lunch,
                status: MealStatus(rawValue: mDTO.status) ?? .planned,
                recipe: mDTO.recipeName.flatMap { recipeMap[$0] },
                selectedSideDishes: mDTO.selectedSideDishes.compactMap { sideMap[$0] },
                attendees: allParticipants.filter { $0.isActive } // Restauration basique des présences
            )
            context.insert(m)
        }
        
        try context.save()
    }
}
