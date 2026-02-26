import SwiftUI
import SwiftData

struct ParticipantFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    var participant: Participant?
    
    @State private var name: String = ""
    @State private var isActive: Bool = true
    @State private var allergies: [String] = []
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Informations")) {
                    TextField("Prénom", text: $name)
                    Toggle("Actif pour les menus", isOn: $isActive)
                }
                
                AllergenInputView(allergens: $allergies)
            }
            .navigationTitle(participant == nil ? "Nouveau Membre" : "Modifier le Membre")
            .navigationBarItems(
                leading: Button("Annuler") { dismiss() },
                trailing: Button("Enregistrer") { save() }.disabled(name.isEmpty)
            )
            .onAppear {
                if let participant = participant {
                    name = participant.name
                    isActive = participant.isActive
                    allergies = participant.allergies
                }
            }
        }
    }
    
    private func save() {
        if let participant = participant {
            participant.name = name
            participant.isActive = isActive
            participant.allergies = allergies
        } else {
            let newParticipant = Participant(name: name, isActive: isActive, allergies: allergies)
            modelContext.insert(newParticipant)
        }
        dismiss()
    }
}
