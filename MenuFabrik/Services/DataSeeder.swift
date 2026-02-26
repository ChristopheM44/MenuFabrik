import Foundation
import SwiftData

@MainActor
class DataSeeder {
    static func seed(context: ModelContext) {
        // 1. Ajouter des participants
        let p1 = Participant(name: "Christophe", isActive: true, allergies: ["Arachide"])
        let p2 = Participant(name: "Marie", isActive: true, allergies: [])
        let p3 = Participant(name: "Enfant 1", isActive: true, allergies: ["Gluten"])
        
        context.insert(p1)
        context.insert(p2)
        context.insert(p3)
        
        // 2. Ajouter des recettes variées
        let recipes = [
            Recipe(name: "Pâtes Carbonara", prepTime: 20, mealType: .both, category: .pasta, allergens: ["Gluten", "Lactose"]),
            Recipe(name: "Salade César", prepTime: 15, mealType: .lunch, category: .salad, allergens: ["Gluten"]),
            Recipe(name: "Poulet Rôti aux Pommes de terre", prepTime: 60, mealType: .dinner, category: .meat, allergens: []),
            Recipe(name: "Saumon en Papillote", prepTime: 30, mealType: .dinner, category: .fish, allergens: []),
            Recipe(name: "Soupe de Potiron", prepTime: 25, mealType: .dinner, category: .soup, allergens: []),
            Recipe(name: "Burger Maison", prepTime: 40, mealType: .both, category: .fastFood, allergens: ["Gluten"]),
            Recipe(name: "Couscous Végétarien", prepTime: 45, mealType: .both, category: .vegetarian, allergens: ["Gluten"]),
            Recipe(name: "Steak Frites", prepTime: 20, mealType: .both, category: .meat, allergens: []),
            Recipe(name: "Omelette aux Champignons", prepTime: 15, mealType: .lunch, category: .other, allergens: []),
            Recipe(name: "Risotto aux Asperges", prepTime: 40, mealType: .dinner, category: .other, allergens: ["Lactose"])
        ]
        
        for recipe in recipes {
            context.insert(recipe)
        }
        
        // Sauvegarder
        do {
            try context.save()
            print("Données de test injectées avec succès.")
        } catch {
            print("Erreur lors de l'injection : \(error)")
        }
    }
}
