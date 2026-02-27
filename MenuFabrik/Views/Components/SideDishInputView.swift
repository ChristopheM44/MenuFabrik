import SwiftUI
import SwiftData

struct SideDishInputView: View {
    @Binding var sides: [SideDish]
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \SideDish.name) private var availableSides: [SideDish]
    
    var body: some View {
        Section(header: Text("Accompagnements (Suggestions)")) {
            ForEach(sides) { side in
                HStack {
                    Text(side.name)
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
            
            if !availableSides.isEmpty {
                Menu {
                    ForEach(availableSides.filter { s in !sides.contains(s) }) { side in
                        Button(side.name) {
                            sides.append(side)
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Ajouter un accompagnement...")
                    }
                }
            } else {
                Text("Aucun accompagnement défini. Allez dans Réglages.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
