import SwiftUI
import SwiftData
import PhotosUI

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
                Section {
                    HStack {
                        Spacer()
                        PhotosPicker(selection: $viewModel.selectedPhoto, matching: .images, photoLibrary: .shared()) {
                            if let photoData = viewModel.photoData, let uiImage = UIImage(data: photoData) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 80, height: 80)
                                    .clipShape(Circle())
                            } else {
                                ZStack {
                                    Circle()
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(width: 80, height: 80)
                                    Image(systemName: "camera.fill")
                                        .foregroundColor(.gray)
                                        .font(.title)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.clear)
                
                Section(header: Text("Informations")) {
                    TextField("Prénom", text: $viewModel.name)
                    Toggle("Actif pour les menus", isOn: $viewModel.isActive)
                }
                
                AllergenInputView(allergens: $viewModel.allergies)
                
                if viewModel.editingParticipantID != nil {
                    Section {
                        Button("Supprimer le membre", role: .destructive) {
                            if let id = viewModel.editingParticipantID, let participant = modelContext.registeredModel(for: id) as Participant? {
                                modelContext.delete(participant)
                                try? modelContext.save()
                                dismiss()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
            }
            .navigationTitle(viewModel.editingParticipantID == nil ? "Nouveau Membre" : "Modifier le Membre")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") {
                        viewModel.save(context: modelContext)
                        dismiss()
                    }
                    .disabled(viewModel.isSaveDisabled)
                }
            }
        }
    }
}
