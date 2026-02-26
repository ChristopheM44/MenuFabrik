import Foundation
import SwiftData

@MainActor
class DataSeeder {
    static func seed(context: ModelContext) {
        // 1. Ajouter des participants (s'ils n'existent pas déjà)
        let fetchParticipants = FetchDescriptor<Participant>()
        if let existingParticipants = try? context.fetch(fetchParticipants), existingParticipants.isEmpty {
            let p1 = Participant(name: "Christophe", isActive: true, allergies: ["Arachide"])
            let p2 = Participant(name: "Marie", isActive: true, allergies: [])
            let p3 = Participant(name: "Enfant 1", isActive: true, allergies: ["Gluten"])
            
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
        let recipeNames = [
            "apero", "Arancini", "Ballotine de poulet", "barbecue", "Bœuf aux oignons", 
            "boulettes de boeuf sauce tomate", "Boulettes de poulet tsukune", 
            "brunch fromage", "brunch sucré - salé", "burgers maison", "Butter chicken", 
            "cake quinoa jambon", "calamar à la romaine", "cordon bleu", "courge farcie", 
            "courge spaghettis carbo", "courgettes farcies", "crevettes curry coco", 
            "croque monsieur", "donuts / tenders / nuggets", "fajitas", "filet mignon", 
            "Fish & chips", "galettes ble noir", "galettes chou fleur", "galettes legumes", 
            "Gigot de 7H", "gratin chou fleur", "gyozas", "hachis parmentier", "Jambon", 
            "Lasagnes", "Achat Leclerc (pendant les courses)", "McDo", "marmite espagnole", 
            "nems", "omelette jambon fromage", "one pot poulet olive", "pad thai", 
            "pates bolognaises", "pates chinoises", "pates poireaux bacon moutarde", 
            "pizzas", "Plancha", "poireaux jambon pdt béchamel", "poisson pané", 
            "polenta gratiné poireaux", "poulet gratiné au four", "poulet pané", 
            "poulet roti", "quiche lorraine", "raclette", "Restaurant", "restes", 
            "risotto chorizo", "risotto courgettes", "rougaille saucisse", 
            "roulé courgette st moret", "rouleaux printemps", "saint jacques", 
            "salade cesar", "salade composée", "Salade de pâtes", 
            "Salade poulet avocat mangue quinoa", "samossas", "sandwich", 
            "soupe champi", "soupe légumes", "steak hachee", "Tacos big mac", 
            "tarte au thon", "tarte poireaux lardon reblochon", "tartiflette", 
            "tomates farcies", "viande rouge", "wraps"
        ]
        
        var recipes: [Recipe] = []
        for name in recipeNames {
            let lower = name.lowercased()
            var category: RecipeCategory = .other
            
            if lower.contains("pate") || lower.contains("pâte") || lower.contains("lasagne") || lower.contains("macaroni") {
                category = .pasta
            } else if lower.contains("boeuf") || lower.contains("bœuf") || lower.contains("poulet") || lower.contains("viande") || lower.contains("jambon") || lower.contains("saucisse") || lower.contains("mignon") || lower.contains("gigot") || lower.contains("steak") || lower.contains("chorizo") || lower.contains("lardon") {
                category = .meat
            } else if lower.contains("poisson") || lower.contains("crevette") || lower.contains("calamar") || lower.contains("saint jacques") || lower.contains("thon") || lower.contains("fish") {
                category = .fish
            } else if lower.contains("soupe") {
                category = .soup
            } else if lower.contains("salade") {
                category = .salad
            } else if lower.contains("burger") || lower.contains("tacos") || lower.contains("pizza") || lower.contains("mcdo") || lower.contains("nugget") {
                category = .fastFood
            } else if lower.contains("légume") || lower.contains("legume") || lower.contains("chou fleur") || lower.contains("courge") || lower.contains("poireau") {
                category = .vegetarian
            }
            
            let defaultPrepTime = lower.contains("rapide") ? 15 : 30
            recipes.append(Recipe(name: name, prepTime: defaultPrepTime, mealType: .both, category: category))
        }
        
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
