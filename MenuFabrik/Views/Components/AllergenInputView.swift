import SwiftUI

struct AllergenInputView: View {
    @Binding var allergens: [String]
    @State private var newAllergen: String = ""
    
    var body: some View {
        Section(header: Text("Allergènes")) {
            ForEach(allergens, id: \.self) { allergen in
                Text(allergen)
            }
            .onDelete { indices in
                allergens.remove(atOffsets: indices)
            }
            
            HStack {
                TextField("Nouvel allergène (ex: Gluten)", text: $newAllergen)
                Button("Ajouter") {
                    let trimmed = newAllergen.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty && !allergens.contains(trimmed) {
                        allergens.append(trimmed)
                        newAllergen = ""
                    }
                }
                .disabled(newAllergen.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }
}
