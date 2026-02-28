import SwiftUI
import SwiftData

struct SideDishListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \SideDish.name) private var sideDishes: [SideDish]
    @State private var newSide: String = ""
    
    var body: some View {
        Form {
            Section(header: Text("Ajouter un accompagnement")) {
                HStack {
                    TextField("Ex: Frites, Purée...", text: $newSide)
                        .onSubmit { addSideDish() }
                    
                    Button(action: addSideDish) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.blue)
                    }
                    .disabled(newSide.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            
            Section(header: Text("Accompagnements (Source de vérité)")) {
                if sideDishes.isEmpty {
                    Text("Aucun accompagnement trouvé.")
                        .foregroundColor(.secondary)
                } else {
                    List {
                        let sortedSides = sideDishes.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
                        ForEach(sortedSides) { side in
                            @Bindable var editableSide = side
                            TextField("Nom de l'accompagnement", text: $editableSide.name)
                                .onSubmit { try? modelContext.save() }
                        }
                        .onDelete { indices in
                            // Convert visual index back to the actual object to delete
                            for index in indices {
                                let sideToDelete = sortedSides[index]
                                modelContext.delete(sideToDelete)
                            }
                            try? modelContext.save()
                        }
                    }
                }
            }
        }
        .navigationTitle("Accompagnements")
    }
    
    private func addSideDish() {
        let trimmed = newSide.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        
        let exists = sideDishes.contains { $0.name.lowercased() == trimmed.lowercased() }
        if !exists {
            let s = SideDish(name: trimmed)
            modelContext.insert(s)
            try? modelContext.save()
            newSide = ""
        }
    }
}
