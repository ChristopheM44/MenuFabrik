import SwiftUI
import SwiftData
import PhotosUI
import SwiftData

@Observable
class ParticipantFormViewModel {
    var name: String = ""
    var isActive: Bool = true
    var allergies: [Allergen] = []
    var photoData: Data? = nil
    
    // Pour le PhotosPicker
    @ObservationIgnored var selectedPhoto: PhotosPickerItem? {
        didSet {
            Task {
                if let data = try? await selectedPhoto?.loadTransferable(type: Data.self) {
                    await MainActor.run {
                        self.photoData = data
                    }
                }
            }
        }
    }
    
    // Identifiant du modèle d'origine en cas d'édition
    var editingParticipantID: PersistentIdentifier?
    
    var isSaveDisabled: Bool {
        name.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    init(participant: Participant? = nil) {
        if let participant = participant {
            self.editingParticipantID = participant.persistentModelID
            self.name = participant.name
            self.isActive = participant.isActive
            self.allergies = participant.allergies
            self.photoData = participant.photoData
        }
    }
    
    func save(context: ModelContext) {
        if let id = editingParticipantID, let participant = context.registeredModel(for: id) as Participant? {
            // Mise à jour de l'existant
            participant.name = name
            participant.isActive = isActive
            participant.allergies = allergies
            participant.photoData = photoData
        } else {
            // Création d'un nouveau membre
            let newParticipant = Participant(name: name, isActive: isActive, allergies: allergies, photoData: photoData)
            context.insert(newParticipant)
        }
        
        try? context.save()
    }
}
