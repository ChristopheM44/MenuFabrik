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
            
            if !availableAllergens.isEmpty {
                Menu {
                    ForEach(availableAllergens.filter { a in !allergens.contains(a) }) { allergen in
                        Button(allergen.name) {
                            allergens.append(allergen)
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Ajouter un allergène...")
                    }
                }
            } else {
                Text("Aucun allergène défini. Allez dans Réglages.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
