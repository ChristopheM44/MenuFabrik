import SwiftUI
import SwiftData

struct ParticipantFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @State private var viewModel: ParticipantFormViewModel
    
    init(participant: Participant? = nil) {
        _viewModel = State(initialValue: ParticipantFormViewModel(participant: participant))
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Informations")) {
                    TextField("Prénom", text: $viewModel.name)
                    Toggle("Actif pour les menus", isOn: $viewModel.isActive)
                }
                
                AllergenInputView(allergens: $viewModel.allergies)
            }
            .navigationTitle(viewModel.editingParticipant == nil ? "Nouveau Membre" : "Modifier le Membre")
            .navigationBarItems(
                leading: Button("Annuler") { dismiss() },
                trailing: Button("Enregistrer") {
                    viewModel.save(context: modelContext)
                    dismiss()
                }
                .disabled(viewModel.isSaveDisabled)
            )
        }
    }
}
