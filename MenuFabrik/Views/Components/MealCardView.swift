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
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: MealCardViewModel
    @State private var isShowingRecipePicker = false
    
    init(meal: Meal) {
        self._viewModel = State(initialValue: MealCardViewModel(meal: meal))
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(viewModel.meal.type.rawValue)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            
            if viewModel.meal.status == .planned {
                if let recipe = viewModel.meal.recipe {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(recipe.name)
                            .font(.headline)
                            .lineLimit(2)
                        
                        if let sideDish = viewModel.meal.selectedSideDish {
                            Text("avec \(sideDish)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .italic()
                        }
                    }
                    
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
                    Image(systemName: iconForStatus(viewModel.meal.status))
                        .font(.largeTitle)
                        .foregroundColor(colorForStatus(viewModel.meal.status))
                        .padding(.bottom, 4)
                    Text(viewModel.meal.status.rawValue)
                        .font(.headline)
                        .foregroundColor(colorForStatus(viewModel.meal.status))
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(maxHeight: .infinity)
        .padding()
        .background(Color.secondary.opacity(0.1))
        .draggable(MealTransfer(id: viewModel.meal.id))
        .dropDestination(for: MealTransfer.self) { items, location in
            viewModel.handleDrop(of: items, context: modelContext)
        }
        .contextMenu {
            if viewModel.meal.status == .planned {
                Button {
                    viewModel.regenerateMeal(context: modelContext)
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
                        viewModel.changeStatus(to: status, context: modelContext)
                    } label: {
                        if viewModel.meal.status == status {
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
            RecipeSelectionView(meal: viewModel.meal)
        }
    }
    

    private func iconForStatus(_ status: MealStatus) -> String {
        switch status {
        case .restaurant: return "fork.knife"
        case .absent: return "airplane"
        case .work: return "briefcase"
        case .leftovers: return "takeoutbag.and.cup.and.straw"
        case .shopping: return "cart"
        case .skipped: return "xmark.circle"
        case .planned: return "calendar"
        }
    }
    
    private func colorForStatus(_ status: MealStatus) -> Color {
        switch status {
        case .restaurant: return .orange
        case .absent: return .purple
        case .work: return .blue
        case .leftovers: return .brown
        case .shopping: return .teal
        case .skipped: return .gray
        case .planned: return .primary
        }
    }
}
