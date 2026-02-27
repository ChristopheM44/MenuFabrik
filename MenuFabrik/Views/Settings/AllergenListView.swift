import SwiftUI
import SwiftData

struct AllergenListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Allergen.name) private var allergens: [Allergen]
    
    @State private var newAllergenName: String = ""
    
    var body: some View {
        List {
            Section(header: Text("Ajouter un allergène")) {
                HStack {
                    TextField("Nom de l'allergène (ex: Gluten)", text: $newAllergenName)
                    
                    Button("Ajouter") {
                        let trimmed = newAllergenName.trimmingCharacters(in: .whitespaces)
                        if !trimmed.isEmpty && !allergens.contains(where: { $0.name.lowercased() == trimmed.lowercased() }) {
                            let newA = Allergen(name: trimmed)
                            modelContext.insert(newA)
                            try? modelContext.save()
                            newAllergenName = ""
                        }
                    }
                    .disabled(newAllergenName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            
            Section(header: Text("Allergènes connus")) {
                ForEach(allergens) { allergen in
                    Text(allergen.name)
                }
                .onDelete(perform: deleteAllergens)
            }
        }
        .navigationTitle("Allergènes")
    }
    
    private func deleteAllergens(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(allergens[index])
        }
        try? modelContext.save()
    }
}
