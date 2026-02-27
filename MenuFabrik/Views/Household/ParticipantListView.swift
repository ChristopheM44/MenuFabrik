import SwiftUI
import SwiftData

struct ParticipantListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Participant.name) private var participants: [Participant]
    
    @State private var showingAddSheet = false
    @State private var participantToEdit: Participant?
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(participants) { participant in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(participant.name)
                                .font(.headline)
                            Spacer()
                            if participant.isActive {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.red)
                            }
                        }
                        if !participant.allergies.isEmpty {
                            Text("Allergies: \(participant.allergies.map { $0.name }.joined(separator: ", "))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .contentShape(Rectangle()) // Makes the whole row tappable
                    .onTapGesture {
                        participantToEdit = participant
                    }
                }
                .onDelete(perform: deleteParticipants)
            }
            .navigationTitle("Mon Foyer")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingAddSheet = true }) {
                        Label("Ajouter", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                ParticipantFormView(participant: nil)
            }
            .sheet(item: $participantToEdit) { participant in
                ParticipantFormView(participant: participant)
            }
            .overlay {
                if participants.isEmpty {
                    ContentUnavailableView(
                        "Aucun membre",
                        systemImage: "person.3",
                        description: Text("Ajoutez les membres de votre foyer pour personnaliser les menus.")
                    )
                }
            }
        }
    }
    
    private func deleteParticipants(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(participants[index])
        }
    }
}
