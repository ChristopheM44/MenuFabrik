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
                        ForEach(sideDishes) { side in
                            @Bindable var editableSide = side
                            TextField("Nom de l'accompagnement", text: $editableSide.name)
                                .onSubmit { try? modelContext.save() }
                        }
                        .onDelete(perform: deleteSideDishes)
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
    
    private func deleteSideDishes(offsets: IndexSet) {
        for index in offsets {
            let side = sideDishes[index]
            modelContext.delete(side)
        }
        try? modelContext.save()
    }
}
