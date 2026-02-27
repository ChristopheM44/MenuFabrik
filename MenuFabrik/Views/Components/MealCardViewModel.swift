import SwiftUI
import SwiftData

@Observable
class MealCardViewModel {
    var meal: Meal
    
    init(meal: Meal) {
        self.meal = meal
    }
    
    func handleDrop(of items: [MealTransfer], context: ModelContext) -> Bool {
        guard let droppedId = items.first?.id else { return false }
        
        let descriptor = FetchDescriptor<Meal>(predicate: #Predicate { $0.id == droppedId })
        guard let droppedMeal = try? context.fetch(descriptor).first else { return false }
        
        guard droppedMeal.id != meal.id else { return false }
        
        // Intervertir les recettes, statuts et accompagnements
        let tempRecipe = meal.recipe
        let tempStatus = meal.status
        let tempSideDishes = meal.selectedSideDishes
        
        meal.recipe = droppedMeal.recipe
        meal.status = droppedMeal.status
        meal.selectedSideDishes = droppedMeal.selectedSideDishes
        
        droppedMeal.recipe = tempRecipe
        droppedMeal.status = tempStatus
        droppedMeal.selectedSideDishes = tempSideDishes
        
        try? context.save()
        return true
    }
    
    func changeStatus(to newStatus: MealStatus, context: ModelContext) {
        meal.status = newStatus
        if newStatus != .planned {
            meal.recipe = nil
            meal.selectedSideDishes = []
        } else if meal.recipe == nil {
            regenerateMeal(context: context)
        }
        try? context.save()
    }
    
    func regenerateMeal(context: ModelContext) {
        let generator = MenuGeneratorService(context: context)
        generator.generate(for: meal)
    }
}
