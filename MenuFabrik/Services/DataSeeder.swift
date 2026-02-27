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

        // --- 0.5 Seed SideDishes ---
        let sideDishNames = [
            "ail et fines herbes", "bacon", "bechamel", "burrata", "carottes", "carottes courgette",
            "carottes vichy", "carrottes rapées", "caviar aubergine", "champignons", "charcut",
            "chevre", "chevre chaud", "chips", "concombre", "creme champignons", "Crudités",
            "eminces jambon", "epinards", "frites", "fromage", "fromage fouetté", "galette pdt rosti",
            "gnocchis", "haricots verts", "jambon", "Nouilles sautées aux légumes", "olives", "pain", "pates",
            "pdt rissolees", "petits pois", "poêlée légumes", "poireaux", "pommes de terres",
            "pommes noisettes", "Pommes rissolées", "puree legumes", "ratatouille", "riz",
            "riz cantonais", "rosti", "salade", "semoule", "tian aubergine"
        ]
        
        var sidesDict: [String: SideDish] = [:]
        
        let fetchSides = FetchDescriptor<SideDish>()
        if let existingSides = try? context.fetch(fetchSides) {
            for s in existingSides {
                sidesDict[s.name] = s
            }
        }
        
        for name in sideDishNames {
            if sidesDict[name] == nil {
                let s = SideDish(name: name)
                context.insert(s)
                sidesDict[name] = s
            }
        }
        
        func mapSides(_ names: [String]) -> [SideDish] {
            return names.compactMap { name in
                // Si la string correspond exactement à un SideDish connu, on le retourne
                if let existing = sidesDict[name] { return existing }
                // Sinon on le crée à la volée pour supporter les anciens noms originaux,
                // qui se rajouteront "globalement" à la liste.
                let newSide = SideDish(name: name)
                context.insert(newSide)
                sidesDict[name] = newSide
                return newSide
            }
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
        
        // 3. Ajouter la nouvelle liste de recettes avec mapSides() au lieu de tableaux de String
        let recipes = [
            Recipe(name: "apero", prepTime: 10, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Arancini", prepTime: 60, mealType: .both, category: .vegetarian, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: true, suggestedSides: mapSides([])),
            Recipe(name: "Ballotine de poulet", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["puree legumes", "haricots verts", "riz"])),
            Recipe(name: "barbecue", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["salade", "Pommes rissolées", "chips"])),
            Recipe(name: "Bœuf aux oignons", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "Nouilles sautées aux légumes"])),
            Recipe(name: "boulettes de boeuf sauce tomate", prepTime: 30, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["pates", "riz", "semoule"])),
            Recipe(name: "Boulettes de poulet tsukune", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "poêlée légumes"])),
            Recipe(name: "brunch fromage", prepTime: 20, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "brunch sucré - salé", prepTime: 30, mealType: .lunch, category: .other, allergens: mapAllergens(["Lactose", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "burgers maison", prepTime: 30, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Butter chicken", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "pain"])),
            Recipe(name: "cake quinoa jambon", prepTime: 50, mealType: .lunch, category: .meat, allergens: mapAllergens(["Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "calamar à la romaine", prepTime: 25, mealType: .dinner, category: .fish, allergens: mapAllergens(["Gluten", "Mollusques", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["frites", "salade"])),
            Recipe(name: "cordon bleu", prepTime: 15, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["pates", "haricots verts", "puree legumes"])),
            Recipe(name: "courge farcie", prepTime: 60, mealType: .dinner, category: .vegetarian, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["salade", "riz"])),
            Recipe(name: "courge spaghettis carbo", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "courgettes farcies", prepTime: 50, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "semoule"])),
            Recipe(name: "crevettes curry coco", prepTime: 20, mealType: .both, category: .fish, allergens: mapAllergens(["Crustacés"]), requiresFreeTime: false, suggestedSides: mapSides(["riz"])),
            Recipe(name: "croque monsieur", prepTime: 15, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "donuts / tenders / nuggets", prepTime: 20, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["frites", "Pommes rissolées"])),
            Recipe(name: "fajitas", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "filet mignon", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["pommes noisettes", "haricots verts", "champignons"])),
            Recipe(name: "Fish & chips", prepTime: 30, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Poisson"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "galettes ble noir", prepTime: 20, mealType: .dinner, category: .other, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "galettes chou fleur", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf", "Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "galettes legumes", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["salade", "riz"])),
            Recipe(name: "Gigot de 7H", prepTime: 420, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Pommes rissolées", "haricots verts"])),
            Recipe(name: "gratin chou fleur", prepTime: 45, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "gyozas", prepTime: 30, mealType: .dinner, category: .other, allergens: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "carottes rapées"])),
            Recipe(name: "hachis parmentier", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "Jambon", prepTime: 5, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["puree legumes", "pates", "frites"])),
            Recipe(name: "Lasagnes", prepTime: 75, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["salade"])),
            Recipe(name: "McDo", prepTime: 0, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "marmite espagnole", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "nems", prepTime: 30, mealType: .dinner, category: .other, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["riz cantonais", "salade"])),
            Recipe(name: "omelette jambon fromage", prepTime: 15, mealType: .lunch, category: .meat, allergens: mapAllergens(["Oeuf", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["salade", "pain"])),
            Recipe(name: "one pot poulet olive", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "pad thai", prepTime: 30, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Soja", "Arachides"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "pates bolognaises", prepTime: 25, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "pates chinoises", prepTime: 20, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "pates poireaux bacon moutarde", prepTime: 25, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "pizzas", prepTime: 20, mealType: .dinner, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Plancha", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["poêlée légumes", "salade", "pommes de terres"])),
            Recipe(name: "poireaux jambon pdt béchamel", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "poisson pané", prepTime: 15, mealType: .lunch, category: .fish, allergens: mapAllergens(["Poisson", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "epinards", "puree legumes"])),
            Recipe(name: "polenta gratiné poireaux", prepTime: 40, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "poulet gratiné au four", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["riz", "pates", "pommes de terres"])),
            Recipe(name: "poulet pané", prepTime: 20, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["frites", "salade"])),
            Recipe(name: "poulet roti", prepTime: 90, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["pommes de terres", "haricots verts"])),
            Recipe(name: "quiche lorraine", prepTime: 50, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "raclette", prepTime: 20, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: mapSides([])),
            Recipe(name: "Restaurant", prepTime: 0, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "risotto chorizo", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "risotto courgettes", prepTime: 40, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "rougaille saucisse", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["riz"])),
            Recipe(name: "roulé courgette st moret", prepTime: 30, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "rouleaux printemps", prepTime: 45, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Arachides", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "saint jacques", prepTime: 15, mealType: .dinner, category: .fish, allergens: mapAllergens(["Mollusques", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["poireaux", "riz"])),
            Recipe(name: "salade cesar", prepTime: 20, mealType: .both, category: .salad, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "salade composée", prepTime: 15, mealType: .both, category: .salad, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Salade de pâtes", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Salade poulet avocat mangue quinoa", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "samossas", prepTime: 45, mealType: .dinner, category: .other, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["salade", "riz cantonais"])),
            Recipe(name: "sandwich", prepTime: 10, mealType: .lunch, category: .fastFood, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "soupe champi", prepTime: 30, mealType: .dinner, category: .soup, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["pain"])),
            Recipe(name: "soupe légumes", prepTime: 40, mealType: .dinner, category: .soup, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["fromage"])),
            Recipe(name: "steak hachee", prepTime: 10, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["frites", "pates", "haricots verts"])),
            Recipe(name: "Tacos big mac", prepTime: 25, mealType: .dinner, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "tarte au thon", prepTime: 50, mealType: .dinner, category: .fish, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "tarte poireaux lardon reblochon", prepTime: 55, mealType: .dinner, category: .meat, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["salade"])),
            Recipe(name: "tartiflette", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["salade", "charcut"])),
            Recipe(name: "tomates farcies", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["riz"])),
            Recipe(name: "viande rouge", prepTime: 10, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["frites", "haricots verts"])),
            Recipe(name: "wraps", prepTime: 15, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([]))
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
