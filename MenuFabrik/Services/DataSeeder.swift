import Foundation
import SwiftData

@MainActor
class DataSeeder {
    static func seed(context: ModelContext) {
        // --- 0. Seed Allergens ---
        let allergenNames = [
            "Amandes",
            "Arachides",       
            "Céleri",
            "Crustacés",
            "Gluten",
            "Lactose",
            "Lupin",
            "Mollusques",
            "Moutarde",
            "Noisettes",       
            "Noix",          
            "Noix de cajou",
            "Noix de macadamia",
            "Noix de pécan",
            "Oeuf",
            "Pistaches",
            "Poisson",
            "Sésame",
            "Soja",
            "Sulfites"
        ]
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
            "Ail et fines herbes", "Asperges", "Bacon", "Béchamel", "Boulgour", 
            "Brocolis vapeur", "Burrata", "Carottes", "Carottes et courgettes", 
            "Carottes râpées", "Carottes Vichy", "Caviar d'aubergine", "Champignons", 
            "Charcuterie", "Chèvre", "Chèvre chaud", "Chips", "Chorizo", "Concombre", 
            "Coquillettes", "Courgettes sautées", "Crème aux champignons", "Crudités", 
            "Émincés de jambon", "Épinards", "Fondue de poireaux", "Frites", 
            "Frites de patate douce", "Fromage", "Fromage fouetté", "Gnocchis", 
            "Gratin dauphinois", "Gratin de chou-fleur", "Haricots verts", "Jambon", 
            "Julienne de légumes", "Lardons", "Lentilles", "Mozzarella", 
            "Nouilles sautées aux légumes", "Œuf au plat", "Olives", "Pain", 
            "Parmesan râpé", "Patates douces rôties", "Pâtes", "Petits pois", 
            "Poêlée de légumes", "Poireaux", "Polenta", "Pommes de terre", 
            "Pommes noisettes", "Pommes rissolées", "Purée de légumes", 
            "Purée de pommes de terre", "Quinoa", "Ratatouille", "Riz", 
            "Riz cantonais", "Röstis de pommes de terre", "Salade verte", 
            "Saumon fumé", "Sauce au poivre", "Sauce tomate", "Sauce yaourt et ciboulette", 
            "Semoule", "Tian d'aubergines", "Tomates à la provençale"
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

        // 1. Mettre à jour les participants (synchronisation)
        let fetchParticipants = FetchDescriptor<Participant>()
        let existingParticipants = (try? context.fetch(fetchParticipants)) ?? []
        
        // On désactive tous les anciens par défaut pour ne pas casser l'historique des vieux repas
        for p in existingParticipants {
            p.isActive = false
        }
        
        // Helper pour mettre à jour ou créer
        func upsertParticipant(name: String, allergies: [Allergen]) {
            if let existing = existingParticipants.first(where: { $0.name == name }) {
                existing.isActive = true
                existing.allergies = allergies
            } else {
                let newP = Participant(name: name, isActive: true, allergies: allergies)
                context.insert(newP)
            }
        }
        
        upsertParticipant(name: "Christophe", allergies: mapAllergens(["Arachide"]))
        upsertParticipant(name: "Edith", allergies: mapAllergens(["Gluten"]))
        upsertParticipant(name: "Jonathan", allergies: mapAllergens([]))
        upsertParticipant(name: "Kylian", allergies: mapAllergens([]))
        
        // 1.5. Détacher les anciennes recettes des repas existants pour éviter les crashs "invalidated model instance"
        let fetchMeals = FetchDescriptor<Meal>()
        if let existingMeals = try? context.fetch(fetchMeals) {
            for meal in existingMeals {
                meal.recipe = nil
            }
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
            Recipe(name: "Apero", prepTime: 10, mealType: .both, category: .other, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Arancini", prepTime: 60, mealType: .both, category: .vegetarian, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: true, suggestedSides: mapSides([])),
            Recipe(name: "Ballotine de poulet", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Purée de légumes", "Haricots verts", "Riz"]), sourceURL: "https://cookidoo.fr/recipes/recipe/fr-FR/r57840"),
            Recipe(name: "Barbecue", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Salade verte", "Pommes rissolées", "Chips"])),
            Recipe(name: "Bœuf aux oignons", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Nouilles sautées aux légumes"])),
            Recipe(name: "Boulettes de boeuf sauce tomate", prepTime: 30, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Pâtes", "Riz", "Semoule"])),
            Recipe(name: "Boulettes de poulet tsukune", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Poêlée de légumes"])),
            Recipe(name: "Brunch fromage", prepTime: 20, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Brunch sucré - salé", prepTime: 30, mealType: .lunch, category: .other, allergens: mapAllergens(["Lactose", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Burgers maison", prepTime: 30, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Butter chicken", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Pain"])),
            Recipe(name: "Cake quinoa jambon", prepTime: 50, mealType: .lunch, category: .meat, allergens: mapAllergens(["Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Calamar à la romaine", prepTime: 25, mealType: .dinner, category: .fish, allergens: mapAllergens(["Gluten", "Mollusques", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Frites", "Salade verte"])),
            Recipe(name: "Cordon bleu", prepTime: 15, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Pâtes", "Haricots verts", "Purée de légumes"])),
            Recipe(name: "Courge farcie", prepTime: 60, mealType: .dinner, category: .vegetarian, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Salade verte", "Riz"])),
            Recipe(name: "Courge spaghettis carbo", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Courgettes farcies", prepTime: 50, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Semoule"])),
            Recipe(name: "Crevettes curry coco", prepTime: 20, mealType: .both, category: .fish, allergens: mapAllergens(["Crustacés"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz"])),
            Recipe(name: "Croque monsieur", prepTime: 15, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Donuts / Tenders / Nuggets", prepTime: 20, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Frites", "Pommes rissolées"])),
            Recipe(name: "Fajitas", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Filet mignon", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Pommes noisettes", "Haricots verts", "Champignons"])),
            Recipe(name: "Fish & chips", prepTime: 30, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Poisson"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Galettes blé noir", prepTime: 20, mealType: .dinner, category: .other, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Galettes chou fleur", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf", "Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Galettes legumes", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte", "Riz"])),
            Recipe(name: "Gigot de 7H", prepTime: 420, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Pommes rissolées", "Haricots verts"])),
            Recipe(name: "Gratin chou fleur", prepTime: 45, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Gyozas", prepTime: 30, mealType: .dinner, category: .other, allergens: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Carottes râpées"])),
            Recipe(name: "Hachis parmentier", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Jambon", prepTime: 5, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Purée de légumes", "Pâtes", "Frites"])),
            Recipe(name: "Lasagnes", prepTime: 75, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "McDo", prepTime: 0, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Marmite espagnole", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Nems", prepTime: 30, mealType: .dinner, category: .other, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz cantonais", "Salade verte"])),
            Recipe(name: "Omelette jambon fromage", prepTime: 15, mealType: .lunch, category: .meat, allergens: mapAllergens(["Oeuf", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte", "Pain"])),
            Recipe(name: "One pot poulet olive", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Pad thai", prepTime: 30, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Soja", "Arachides"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Pâtes bolognaises", prepTime: 25, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Pâtes chinoises", prepTime: 20, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Pâtes poireaux bacon moutarde", prepTime: 25, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Pizzas", prepTime: 20, mealType: .dinner, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Plancha", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Poêlée de légumes", "Salade verte", "Pommes de terre"])),
            Recipe(name: "Poireaux jambon pdt béchamel", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Poisson pané", prepTime: 15, mealType: .lunch, category: .fish, allergens: mapAllergens(["Poisson", "Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Épinards", "Purée de légumes"])),
            Recipe(name: "Polenta gratiné poireaux", prepTime: 40, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Poulet gratiné au four", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Pâtes", "Pommes de terre"])),
            Recipe(name: "Poulet pané", prepTime: 20, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Frites", "Salade verte"])),
            Recipe(name: "Poulet roti", prepTime: 90, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Pommes de terre", "Haricots verts"])),
            Recipe(name: "Quiche lorraine", prepTime: 50, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Raclette", prepTime: 20, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: mapSides([])),
            Recipe(name: "Risotto chorizo", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Risotto courgettes", prepTime: 40, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Rougail saucisse", prepTime: 45, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Riz"])),
            Recipe(name: "Roulé courgette st moret", prepTime: 30, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Rouleaux printemps", prepTime: 45, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Arachides", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Saint jacques", prepTime: 15, mealType: .dinner, category: .fish, allergens: mapAllergens(["Mollusques", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Fondue de poireaux", "Riz"])),
            Recipe(name: "Salade césar", prepTime: 20, mealType: .both, category: .salad, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Salade composée", prepTime: 15, mealType: .both, category: .salad, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Salade de pâtes", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Salade poulet avocat mangue quinoa", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Samossas", prepTime: 45, mealType: .dinner, category: .other, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte", "Riz cantonais"])),
            Recipe(name: "Sandwich", prepTime: 10, mealType: .lunch, category: .fastFood, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Soupe champi", prepTime: 30, mealType: .dinner, category: .soup, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Pain"])),
            Recipe(name: "Soupe légumes", prepTime: 40, mealType: .dinner, category: .soup, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Fromage"])),
            Recipe(name: "Steak haché", prepTime: 10, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Frites", "Pâtes", "Haricots verts"])),
            Recipe(name: "Tacos big mac", prepTime: 25, mealType: .dinner, category: .fastFood, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Tarte au thon", prepTime: 50, mealType: .dinner, category: .fish, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Tarte poireaux lardon reblochon", prepTime: 55, mealType: .dinner, category: .meat, allergens: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Tartiflette", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["Salade verte", "Charcuterie"])),
            Recipe(name: "Tomates farcies", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Riz"])),
            Recipe(name: "Viande rouge", prepTime: 10, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Frites", "Haricots verts"])),
            Recipe(name: "Wraps", prepTime: 15, mealType: .both, category: .fastFood, allergens: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Poulet basquaise", prepTime: 50, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: true, suggestedSides: mapSides(["Riz", "Pommes de terre"])),
            Recipe(name: "Blanquette de veau", prepTime: 90, mealType: .both, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["Riz", "Carottes Vichy"])),
            Recipe(name: "Chili con carne", prepTime: 60, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Pain"])),
            Recipe(name: "Curry de pois chiches", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Boulgour"])),
            Recipe(name: "Dahl de lentilles", prepTime: 35, mealType: .dinner, category: .vegetarian, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Pain"])),
            Recipe(name: "Moussaka", prepTime: 75, mealType: .both, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Saumon en papillote", prepTime: 25, mealType: .dinner, category: .fish, allergens: mapAllergens(["Poisson"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Julienne de légumes", "Brocolis vapeur"])),
            Recipe(name: "Gratin de coquillettes au jambon", prepTime: 35, mealType: .both, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Endives au jambon", prepTime: 50, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Porc au caramel", prepTime: 40, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz cantonais", "Nouilles sautées aux légumes"])),
            Recipe(name: "Wok de boeuf aux brocolis", prepTime: 25, mealType: .dinner, category: .meat, allergens: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSides: mapSides(["Riz", "Nouilles sautées aux légumes"])),
            Recipe(name: "Tarte à la moutarde et tomates", prepTime: 45, mealType: .lunch, category: .vegetarian, allergens: mapAllergens(["Gluten", "Lactose", "Moutarde"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Saucisse purée", prepTime: 25, mealType: .both, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Purée de pommes de terre", "Haricots verts"])),
            Recipe(name: "Escalope de dinde à la crème", prepTime: 20, mealType: .dinner, category: .meat, allergens: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Pâtes", "Champignons", "Riz"])),
            Recipe(name: "Shakshuka", prepTime: 30, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Pain", "Semoule"])),
            Recipe(name: "Mac and Cheese", prepTime: 40, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Cannelloni ricotta épinards", prepTime: 60, mealType: .dinner, category: .vegetarian, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSides: mapSides(["Salade verte"])),
            Recipe(name: "Salade niçoise", prepTime: 20, mealType: .lunch, category: .salad, allergens: mapAllergens(["Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Steak de thon grillé", prepTime: 15, mealType: .dinner, category: .fish, allergens: mapAllergens(["Poisson"]), requiresFreeTime: false, suggestedSides: mapSides(["Ratatouille", "Riz", "Tomates à la provençale"])),
            Recipe(name: "Moules frites", prepTime: 30, mealType: .dinner, category: .fish, allergens: mapAllergens(["Mollusques"]), requiresFreeTime: false, suggestedSides: mapSides(["Frites"])),
            Recipe(name: "Poke bowl saumon", prepTime: 25, mealType: .lunch, category: .fish, allergens: mapAllergens(["Poisson", "Soja"]), requiresFreeTime: false, suggestedSides: mapSides([])),
            Recipe(name: "Keftas d'agneau", prepTime: 30, mealType: .dinner, category: .meat, allergens: mapAllergens([]), requiresFreeTime: false, suggestedSides: mapSides(["Semoule", "Sauce yaourt et ciboulette", "Courgettes sautées"])),
            Recipe(name: "Gnocchis au gorgonzola", prepTime: 15, mealType: .dinner, category: .pasta, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Salade verte", "Noix"])),
            Recipe(name: "Soupe à l'oignon", prepTime: 50, mealType: .dinner, category: .soup, allergens: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSides: mapSides(["Pain", "Fromage"])),
            Recipe(name: "Couscous poulet merguez", prepTime: 60, mealType: .both, category: .meat, allergens: mapAllergens(["Gluten"]), requiresFreeTime: true, suggestedSides: mapSides(["Semoule", "Poêlée de légumes"])),
            Recipe(name: "Croquettes de poisson", prepTime: 35, mealType: .dinner, category: .fish, allergens: mapAllergens(["Poisson", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSides: mapSides(["Purée de pommes de terre", "Salade verte"]))
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
