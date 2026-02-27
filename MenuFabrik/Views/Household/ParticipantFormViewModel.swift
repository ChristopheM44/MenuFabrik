import SwiftUI
import SwiftData

@Observable
class ParticipantFormViewModel {
    var name: String = ""
    var isActive: Bool = true
    var allergies: [Allergen] = []
    
    // Modèle d'origine en cas d'édition
    var editingParticipant: Participant?
    
    var isSaveDisabled: Bool {
        name.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    init(participant: Participant? = nil) {
        if let participant = participant {
            self.editingParticipant = participant
            self.name = participant.name
            self.isActive = participant.isActive
            self.allergies = participant.allergies
        }
    }
    
    func save(context: ModelContext) {
        if let participant = editingParticipant {
            // Mise à jour de l'existant
            participant.name = name
            participant.isActive = isActive
            participant.allergies = allergies
        } else {
            // Création d'un nouveau membre
            let newParticipant = Participant(name: name, isActive: isActive, allergies: allergies)
            context.insert(newParticipant)
        }
        
        try? context.save()
    }
}
