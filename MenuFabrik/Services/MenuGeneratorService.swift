import Foundation
import SwiftData

class MenuGeneratorService {
    private let context: ModelContext
    
    init(context: ModelContext) {
        self.context = context
    }
    
    func generate(for menu: WeeklyMenu) {
        // Le service ne fait plus que récupérer les données de la base
        let fetchParticipants = FetchDescriptor<Participant>(predicate: #Predicate { $0.isActive == true })
        let participants = (try? context.fetch(fetchParticipants)) ?? []
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        
        guard let meals = menu.meals else { return }
        
        // On délègue toute la logique complexe au moteur pur et testable
        MenuGeneratorEngine.generateMenu(
            for: meals,
            availableRecipes: allRecipes,
            participants: participants
        )
        
        // Et on se contente de sauvegarder
        try? context.save()
    }
    
    func generate(for meal: Meal) {
        guard let menu = meal.menu else { return }
        
        let fetchParticipants = FetchDescriptor<Participant>(predicate: #Predicate { $0.isActive == true })
        let participants = (try? context.fetch(fetchParticipants)) ?? []
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        
        let history = menu.meals ?? []
        
        MenuGeneratorEngine.generateAlternative(
            for: meal,
            availableRecipes: allRecipes,
            participants: participants,
            history: history
        )
        
        try? context.save()
    }
}
