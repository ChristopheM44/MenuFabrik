import SwiftUI

struct SideDishInputView: View {
    @Binding var sides: [String]
    @State private var newSide: String = ""
    
    var body: some View {
        Section(header: Text("Accompagnements (Suggestions)")) {
            ForEach(sides, id: \.self) { side in
                HStack {
                    Text(side)
                    Spacer()
                    Button {
                        if let index = sides.firstIndex(of: side) {
                            sides.remove(at: index)
                        }
                    } label: {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                }
            }
            .onDelete { indices in
                sides.remove(atOffsets: indices)
            }
            
            HStack {
                TextField("Nouvel accompagnement (ex: Frites)", text: $newSide)
                Button("Ajouter") {
                    let trimmed = newSide.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty && !sides.contains(trimmed) {
                        sides.append(trimmed)
                        newSide = ""
                    }
                }
                .disabled(newSide.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }
}
