import SwiftUI
import SwiftData
internal import UniformTypeIdentifiers

struct MealTransfer: Codable, Transferable {
    let id: UUID
    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .data)
    }
}

struct MealCardView: View {
    let meal: Meal
    
    @State private var isShowingRecipePicker = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(meal.type.rawValue)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            
            if meal.status == .planned {
                if let recipe = meal.recipe {
                    Text(recipe.name)
                        .font(.headline)
                        .lineLimit(2)
                    
                    HStack {
                        Image(systemName: "clock")
                        Text("\(recipe.prepTime) min")
                        
                        Spacer()
                        
                        Text(recipe.category.rawValue)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                } else {
                    VStack {
                        Spacer()
                        Text("Vide")
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {
                // Affichage stylisé pour les autres statuts
                VStack {
                    Spacer()
                    Image(systemName: iconForStatus(meal.status))
                        .font(.largeTitle)
                        .foregroundColor(colorForStatus(meal.status))
                        .padding(.bottom, 4)
                    Text(meal.status.rawValue)
                        .font(.headline)
                        .foregroundColor(colorForStatus(meal.status))
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .frame(height: 140)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
        .draggable(MealTransfer(id: meal.id))
        .dropDestination(for: MealTransfer.self) { items, location in
            handleDrop(of: items)
        }
        .contextMenu {
            if meal.status == .planned {
                Button {
                    regenerateMeal()
                } label: {
                    Label("Changer de recette aléatoirement", systemImage: "arrow.triangle.2.circlepath")
                }
                
                Button {
                    isShowingRecipePicker = true
                } label: {
                    Label("Choisir manuellement", systemImage: "hand.tap")
                }
            }
            
            Menu {
                ForEach(MealStatus.allCases, id: \.self) { status in
                    Button {
                        changeStatus(to: status)
                    } label: {
                        if meal.status == status {
                            Label(status.rawValue, systemImage: "checkmark")
                        } else {
                            Text(status.rawValue)
                        }
                    }
                }
            } label: {
                Label("Statut du repas", systemImage: "flag")
            }
        }
        .sheet(isPresented: $isShowingRecipePicker) {
            RecipeSelectionView(meal: meal)
        }
    }
    
    private func handleDrop(of items: [MealTransfer]) -> Bool {
        guard let droppedId = items.first?.id,
              let context = meal.modelContext else { return false }
        
        let descriptor = FetchDescriptor<Meal>(predicate: #Predicate { $0.id == droppedId })
        guard let droppedMeal = try? context.fetch(descriptor).first else { return false }
        
        // Empecher l'échange avec soi-même
        guard droppedMeal.id != meal.id else { return false }
        
        // Intervertir les recettes et les statuts
        let tempRecipe = meal.recipe
        let tempStatus = meal.status
        
        meal.recipe = droppedMeal.recipe
        meal.status = droppedMeal.status
        
        droppedMeal.recipe = tempRecipe
        droppedMeal.status = tempStatus
        
        try? context.save()
        return true
    }
    
    private func changeStatus(to newStatus: MealStatus) {
        meal.status = newStatus
        if newStatus != .planned {
            // On retire la recette si on passe sur un statut non planifié
            meal.recipe = nil
        } else if meal.recipe == nil {
            // Si on repasse en planifié et qu'il n'y a pas de recette, on régénère
            regenerateMeal()
        }
        try? meal.modelContext?.save()
    }
    
    private func regenerateMeal() {
        guard let context = meal.modelContext else { return }
        let generator = MenuGeneratorService(context: context)
        generator.generate(for: meal)
    }
    
    private func iconForStatus(_ status: MealStatus) -> String {
        switch status {
        case .restaurant: return "fork.knife"
        case .absent: return "airplane"
        case .work: return "briefcase"
        case .skipped: return "xmark.circle"
        case .planned: return "calendar"
        }
    }
    
    private func colorForStatus(_ status: MealStatus) -> Color {
        switch status {
        case .restaurant: return .orange
        case .absent: return .purple
        case .work: return .blue
        case .skipped: return .gray
        case .planned: return .primary
        }
    }
}
