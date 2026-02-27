import Foundation
import SwiftData

@MainActor
class DataSeeder {
    static func seed(context: ModelContext) {
        // --- 0. Seed Allergens ---
        let allergenNames = ["Arachide", "Gluten", "Lactose", "Oeuf", "Soja", "Mollusques", "Poisson", "Crustacés", "Arachides"]
        var allergensDict: [String: Allergen] = [:]
        
        let fetchAllergens = FetchDescriptor<Allergen>()
        if let existingAllergens = try? context.fetch(fetchAllergens) {
            for a in existingAllergens {
                allergensDict[a.name] = a
            }
        }
        
        for name in allergenNames {
            if allergensDict[name] == nil {
                let a = Allergen(name: name)
                context.insert(a)
                allergensDict[name] = a
            }
        }
        
        func mapAllergens(_ names: [String]) -> [Allergen] {
            return names.compactMap { allergensDict[$0] }
        }

        // 1. Ajouter des participants (s'ils n'existent pas déjà)
        let fetchParticipants = FetchDescriptor<Participant>()
        if let existingParticipants = try? context.fetch(fetchParticipants), existingParticipants.isEmpty {
            let p1 = Participant(name: "Christophe", isActive: true, allergies: mapAllergens(["Arachide"]))
            let p2 = Participant(name: "Marie", isActive: true, allergies: mapAllergens([]))
            let p3 = Participant(name: "Enfant 1", isActive: true, allergies: mapAllergens(["Gluten"]))
            
            context.insert(p1)
            context.insert(p2)
            context.insert(p3)
        }
        
        // 2. Nettoyer les anciennes recettes pour les remplacer (facultatif mais recommandé si on clique plusieurs fois)
        let fetchRecipes = FetchDescriptor<Recipe>()
        if let existingRecipes = try? context.fetch(fetchRecipes) {
            for recipe in existingRecipes {
                context.delete(recipe)
            }
        }
        
        // 3. Ajouter la nouvelle liste de recettes
        let recipes = [
            Recipe(name: "apero", prepTime: 10, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "Arancini", prepTime: 60, mealType: .both, category: .vegetarian, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: true, suggestedSides: []),
            Recipe(name: "Ballotine de poulet", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Purée de pommes de terre", "Haricots verts", "Riz"]),
            Recipe(name: "barbecue", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: ["Salade composée", "Pommes de terre au four", "Chips"]),
            Recipe(name: "Bœuf aux oignons", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: ["Riz blanc", "Nouilles sautées"]),
            Recipe(name: "boulettes de boeuf sauce tomate", prepTime: 30, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Pâtes", "Riz", "Semoule"]),
            Recipe(name: "Boulettes de poulet tsukune", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: ["Riz", "Légumes sautés"]),
            Recipe(name: "brunch fromage", prepTime: 20, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "brunch sucré - salé", prepTime: 30, mealType: .lunch, category: .other, allergens: mapAllergens(["Lactose", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "burgers maison", prepTime: 30, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "Butter chicken", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: ["Riz basmati", "Naans"]),
            Recipe(name: "cake quinoa jambon", prepTime: 50, mealType: .lunch, category: .meat, allergens: mapAllergens(["Oeuf"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "calamar à la romaine", prepTime: 25, mealType: .dinner, category: .fish, allergens: mapAllergens(["Gluten", "Mollusques", "Oeuf"]), requiresFreeTime: false, suggestedSides: ["Frites", "Salade", "Quartiers de citron"]),
            Recipe(name: "cordon bleu", prepTime: 15, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: ["Coquillettes", "Haricots verts", "Purée"]),
            Recipe(name: "courge farcie", prepTime: 60, mealType: .dinner, category: .vegetarian, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: ["Salade verte", "Riz"]),
            Recipe(name: "courge spaghettis carbo", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "courgettes farcies", prepTime: 50, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Riz", "Boulgour"]),
            Recipe(name: "crevettes curry coco", prepTime: 20, mealType: .both, category: .fish, allergens: mapAllergens(["Crustacés"]), requiresFreeTime: false, suggestedSides: ["Riz basmati", "Nouilles de riz"]),
            Recipe(name: "croque monsieur", prepTime: 15, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "donuts / tenders / nuggets", prepTime: 20, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: ["Frites", "Potatoes"]),
            Recipe(name: "fajitas", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "filet mignon", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Pommes dauphines", "Haricots verts", "Champignons à la crème"]),
            Recipe(name: "Fish & chips", prepTime: 30, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Poisson"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "galettes ble noir", prepTime: 20, mealType: .dinner, category: .other, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "galettes chou fleur", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf", "Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: ["Salade verte", "Sauce yaourt"]),
            Recipe(name: "galettes legumes", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf", "Gluten"]), requiresFreeTime: false, suggestedSides: ["Salade verte", "Riz"]),
            Recipe(name: "Gigot de 7H", prepTime: 420, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: ["Gratin dauphinois", "Fagots de haricots verts", "Pommes grenailles"]),
            Recipe(name: "gratin chou fleur", prepTime: 45, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "gyozas", prepTime: 30, mealType: .dinner, category: .other, allergens: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSides: ["Riz", "Salade de chou", "Edamame"]),
            Recipe(name: "hachis parmentier", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "Jambon", prepTime: 5, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Purée", "Pâtes", "Frites"]),
            Recipe(name: "Lasagnes", prepTime: 75, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSides: ["Salade verte"]),
            Recipe(name: "Achat Leclerc (pendant les courses)", prepTime: 0, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "McDo", prepTime: 0, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "marmite espagnole", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "nems", prepTime: 30, mealType: .dinner, category: .other, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: ["Riz cantonnais", "Salade verte", "Menthe"]),
            Recipe(name: "omelette jambon fromage", prepTime: 15, mealType: .lunch, category: .meat, allergens: mapAllergens(["Oeuf", "Lactose"]), requiresFreeTime: false, suggestedSides: ["Salade verte", "Pain"]),
            Recipe(name: "one pot poulet olive", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "pad thai", prepTime: 30, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Soja", "Arachides"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "pates bolognaises", prepTime: 25, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "pates chinoises", prepTime: 20, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "pates poireaux bacon moutarde", prepTime: 25, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "pizzas", prepTime: 20, mealType: .dinner, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "Plancha", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Légumes grillés", "Salade", "Pommes de terre"]),
            Recipe(name: "poireaux jambon pdt béchamel", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "poisson pané", prepTime: 15, mealType: .lunch, category: .fish, allergens: mapAllergens(["Poisson", "Gluten"]), requiresFreeTime: false, suggestedSides: ["Riz", "Épinards", "Purée"]),
            Recipe(name: "polenta gratiné poireaux", prepTime: 40, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "poulet gratiné au four", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: ["Riz", "Pâtes", "Légumes rôtis"]),
            Recipe(name: "poulet pané", prepTime: 20, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: ["Frites", "Salade verte"]),
            Recipe(name: "poulet roti", prepTime: 90, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: ["Pommes de terre sautées", "Haricots verts"]),
            Recipe(name: "quiche lorraine", prepTime: 50, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "raclette", prepTime: 20, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: []),
            Recipe(name: "Restaurant", prepTime: 0, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "restes", prepTime: 5, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "risotto chorizo", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "risotto courgettes", prepTime: 40, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "rougaille saucisse", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Riz blanc", "Lentilles", "Grains"]),
            Recipe(name: "roulé courgette st moret", prepTime: 30, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "rouleaux printemps", prepTime: 45, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Arachides", "Soja"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "saint jacques", prepTime: 15, mealType: .dinner, category: .fish, allergens: mapAllergens(["Mollusques", "Lactose"]), requiresFreeTime: false, suggestedSides: ["Fondue de poireaux", "Risotto", "Riz"]),
            Recipe(name: "salade cesar", prepTime: 20, mealType: .both, category: .salad, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "salade composée", prepTime: 15, mealType: .both, category: .salad, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "Salade de pâtes", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "Salade poulet avocat mangue quinoa", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "samossas", prepTime: 45, mealType: .dinner, category: .other, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: ["Salade verte", "Riz cantonnais"]),
            Recipe(name: "sandwich", prepTime: 10, mealType: .lunch, category: .fastFood, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "soupe champi", prepTime: 30, mealType: .dinner, category: .soup, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: ["Tartines grillées"]),
            Recipe(name: "soupe légumes", prepTime: 40, mealType: .dinner, category: .soup, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Croûtons", "Fromage râpé"]),
            Recipe(name: "steak hachee", prepTime: 10, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Frites", "Pâtes", "Haricots verts"]),
            Recipe(name: "Tacos big mac", prepTime: 25, mealType: .dinner, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: []),
            Recipe(name: "tarte au thon", prepTime: 50, mealType: .dinner, category: .fish, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "tarte poireaux lardon reblochon", prepTime: 55, mealType: .dinner, category: .meat, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: ["Salade verte"]),
            Recipe(name: "tartiflette", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: ["Salade verte", "Charcuterie"]),
            Recipe(name: "tomates farcies", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: ["Riz"]),
            Recipe(name: "viande rouge", prepTime: 10, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: ["Frites", "Haricots verts", "Gratin dauphinois"]),
            Recipe(name: "wraps", prepTime: 15, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: [])
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
