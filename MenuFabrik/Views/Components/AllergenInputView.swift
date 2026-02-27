import SwiftUI
import SwiftData

struct AllergenInputView: View {
    @Binding var allergens: [Allergen]
    @Environment(\.modelContext) private var modelContext
    @Query private var availableAllergens: [Allergen]
    @State private var newAllergen: String = ""
    
    var body: some View {
        Section(header: Text("Allergènes")) {
            ForEach(allergens) { allergen in
                HStack {
                    Text(allergen.name)
                    Spacer()
                    Button {
                        if let index = allergens.firstIndex(of: allergen) {
                            allergens.remove(at: index)
                        }
                    } label: {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                }
            }
            .onDelete { indices in
                allergens.remove(atOffsets: indices)
            }
            
            HStack {
                TextField("Nouvel allergène (ex: Gluten)", text: $newAllergen)
                Button("Ajouter") {
                    let trimmed = newAllergen.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty && !allergens.contains(where: { $0.name.lowercased() == trimmed.lowercased() }) {
                        if let existing = availableAllergens.first(where: { $0.name.lowercased() == trimmed.lowercased() }) {
                            allergens.append(existing)
                        } else {
                            let newA = Allergen(name: trimmed)
                            modelContext.insert(newA)
                            allergens.append(newA)
                        }
                        newAllergen = ""
                    }
                }
                .disabled(newAllergen.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }
}
