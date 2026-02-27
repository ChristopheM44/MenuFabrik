import Testing
import Foundation
@testable import MenuFabrik

@Suite("Menu Generator Engine Tests")
struct MenuGeneratorEngineTests {

    @Test("Génération d'un repas exempt d'allergènes")
    func testAllergenExclusion() async throws {
        // Arrange
        let meal = Meal(date: Date(), type: .lunch)
        let meals = [meal]
        
        // Recette avec gluten
        let pasta = Recipe(name: "Pâtes", prepTime: 20, mealType: .both, category: .pasta, allergens: [Allergen(name: "Gluten")])
        // Recette sûre sans allergènes
        let salad = Recipe(name: "Salade", prepTime: 15, mealType: .both, category: .salad, allergens: [])
        
        let recipes = [pasta, salad]
        let participants = [Participant(name: "John", isActive: true, allergies: [Allergen(name: "Gluten")])]
        
        // Act
        MenuGeneratorEngine.generateMenu(for: meals, availableRecipes: recipes, participants: participants)
        
        // Assert: Seulement la salade devrait être proposée malgré le hasard
        #expect(meal.recipe?.name == "Salade")
    }
    
    @Test("Le déjeuner privilégie les recettes rapides (< 30 min)")
    func testLunchTimeConstraint() async throws {
        // Arrange
        let meal = Meal(date: Date(), type: .lunch)
        let meals = [meal]
        
        // Recette longue
        let slowRoast = Recipe(name: "Rôti", prepTime: 120, mealType: .both, category: .meat, allergens: [])
        // Recette rapide
        let quickSalad = Recipe(name: "Salade Rapide", prepTime: 15, mealType: .both, category: .salad, allergens: [])
        
        // Bien que les deux soient compatibles avec le midi, l'algo doit forcer le choix de la salade (<30m)
        let recipes = [slowRoast, quickSalad]
        let participants: [Participant] = []
        
        // Act
        MenuGeneratorEngine.generateMenu(for: meals, availableRecipes: recipes, participants: participants)
        
        // Assert
        #expect(meal.recipe?.name == "Salade Rapide")
    }
}
