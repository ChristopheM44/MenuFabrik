import Foundation
import SwiftData

class MenuGeneratorService {
    private let context: ModelContext
    
    init(context: ModelContext) {
        self.context = context
    }
    
    func generate(for meals: [Meal]) {
        // Le service ne fait plus que récupérer les données de la base
        let fetchParticipants = FetchDescriptor<Participant>(predicate: #Predicate { $0.isActive == true })
        let participants = (try? context.fetch(fetchParticipants)) ?? []
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        
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
        // En V3, un repas n'appartient plus forcément à un menu.
        
        let fetchParticipants = FetchDescriptor<Participant>(predicate: #Predicate { $0.isActive == true })
        let participants = (try? context.fetch(fetchParticipants)) ?? []
        
        let fetchRecipes = FetchDescriptor<Recipe>()
        let allRecipes = (try? context.fetch(fetchRecipes)) ?? []
        
        // On récupère un historique récent pour éviter les redites
        let historyDescriptor = FetchDescriptor<Meal>(sortBy: [SortDescriptor(\.date, order: .reverse)])
        let allHistory = (try? context.fetch(historyDescriptor)) ?? []
        let history = Array(allHistory.prefix(30)) // Les 30 derniers repas en historique
        
        MenuGeneratorEngine.generateAlternative(
            for: meal,
            availableRecipes: allRecipes,
            participants: participants,
            history: history
        )
        
        try? context.save()
    }
}
