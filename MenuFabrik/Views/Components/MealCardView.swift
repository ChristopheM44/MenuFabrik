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
    
    // Sheets state
    @State private var isShowingActionHub = false
    @State private var isShowingRecipePicker = false
    @State private var isShowingMealDetail = false
    @State private var isEditingAttendees = false
    
    @Query(filter: #Predicate<Participant> { $0.isActive == true })
    private var allActiveParticipants: [Participant]
    
    init(meal: Meal) {
        self._viewModel = State(initialValue: MealCardViewModel(meal: meal))
    }
    
    var body: some View {
        ZStack {
            // Background
            Color.secondary.opacity(0.1)
                
            VStack(alignment: .leading, spacing: 0) {
                if viewModel.meal.status == .planned {
                    if let recipe = viewModel.meal.recipe {
                        plannedRecipeView(recipe: recipe)
                    } else {
                        emptyRecipeView()
                    }
                } else {
                    otherStatusView()
                }
            }
            .padding()
        }
        .frame(height: 130)
        .cornerRadius(12)
        // Ensure the whole card is tappable
        .contentShape(Rectangle())
        .onTapGesture {
            isShowingActionHub = true
        }
        .draggable(MealTransfer(id: viewModel.meal.id))
        .dropDestination(for: MealTransfer.self) { items, location in
            viewModel.handleDrop(of: items, context: modelContext)
        }
        .sheet(isPresented: $isShowingActionHub) {
            actionHubSheet()
                .presentationDetents([.fraction(0.5), .medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $isShowingRecipePicker) {
            RecipeSelectionView(meal: viewModel.meal)
        }
        .sheet(isPresented: $isShowingMealDetail) {
            MealDetailView(meal: viewModel.meal)
        }
        .sheet(isPresented: $isEditingAttendees) {
            attendeesEditorSheet()
                .presentationDetents([.fraction(0.35)])
                .presentationDragIndicator(.visible)
        }
    }
    
    // Sous-vue pour le repas prévu avec recette
    @ViewBuilder
    private func plannedRecipeView(recipe: Recipe) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            headerRow()
            
            Spacer()
            
            Text(recipe.name)
                .font(.headline)
                .lineLimit(2)
            
            if !viewModel.meal.selectedSideDishes.isEmpty {
                let sidesText = viewModel.meal.selectedSideDishes.map { $0.name }.joined(separator: ", ")
                Text("+ \(sidesText)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .italic()
            }
            
            Spacer()
            
            HStack(spacing: 12) {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                    Text("\(recipe.prepTime) min")
                }
                .font(.caption)
                .foregroundColor(.secondary)
                
                Text(recipe.category.rawValue)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(6)
            }
            
            // Attendees summary preview
            if let attendees = viewModel.meal.attendees, !attendees.isEmpty {
                HStack(spacing: -8) {
                    Spacer()
                    ForEach(attendees.prefix(3)) { attendee in
                        Text(String(attendee.name.prefix(1)).uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .frame(width: 20, height: 20)
                            .background(Color.blue.opacity(0.2))
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color(UIColor.systemBackground), lineWidth: 1))
                    }
                    if attendees.count > 3 {
                        Text("+\(attendees.count - 3)")
                            .font(.system(size: 10, weight: .bold))
                            .frame(width: 20, height: 20)
                            .background(Color.gray.opacity(0.2))
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color(UIColor.systemBackground), lineWidth: 1))
                    }
                }
                .padding(.top, 4)
            }
        }
    }
    
    // Sous-vue pour le repas prévu SANS recette
    @ViewBuilder
    private func emptyRecipeView() -> some View {
        VStack(alignment: .leading, spacing: 4) {
            headerRow()
            
            Spacer()
            
            HStack {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                    Text("Repas à définir")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .italic()
                }
                Spacer()
            }
            
            Spacer()
        }
    }
    
    // Sous-vue pour les autres statuts (Resto, Absent, etc.)
    @ViewBuilder
    private func otherStatusView() -> some View {
        VStack {
            HStack {
                Text(viewModel.meal.type.rawValue)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                Spacer()
            }
            
            Spacer()
            
            HStack(spacing: 12) {
                Image(systemName: iconForStatus(viewModel.meal.status))
                    .font(.title2)
                Text(viewModel.meal.status.rawValue)
                    .font(.headline)
            }
            .foregroundColor(colorForStatus(viewModel.meal.status))
            
            Spacer()
        }
    }
    
    // Header réutilisable (Type de repas)
    @ViewBuilder
    private func headerRow() -> some View {
        HStack {
            Text(viewModel.meal.type.rawValue)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)
            
            Spacer()
        }
    }
    
    // MARK: - Action Hub Sheet
    @ViewBuilder
    private func actionHubSheet() -> some View {
        NavigationStack {
            List {
                Section {
                    if viewModel.meal.status == .planned {
                        if viewModel.meal.recipe != nil {
                            Button {
                                isShowingActionHub = false
                                // Dispatch to allow previous sheet to fully dismiss
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                    isShowingMealDetail = true
                                }
                            } label: {
                                Label("Voir la recette", systemImage: "book")
                            }
                        }
                        
                        Button {
                            // Changer aléatoirement
                            withAnimation {
                                viewModel.regenerateMeal(context: modelContext)
                                isShowingActionHub = false
                            }
                        } label: {
                            Label("Changer aléatoirement", systemImage: "dice")
                        }
                        
                        Button {
                            isShowingActionHub = false
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                isShowingRecipePicker = true
                            }
                        } label: {
                            Label("Choisir manuellement", systemImage: "magnifyingglass")
                        }
                    }
                }
                
                Section("Statut du repas") {
                    ForEach(MealStatus.allCases, id: \.self) { status in
                        Button {
                            withAnimation {
                                viewModel.changeStatus(to: status, context: modelContext)
                                isShowingActionHub = false
                            }
                        } label: {
                            HStack {
                                Image(systemName: iconForStatus(status))
                                    .foregroundColor(colorForStatus(status))
                                    .frame(width: 24)
                                Text(status.rawValue)
                                    .foregroundColor(.primary)
                                Spacer()
                                if viewModel.meal.status == status {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }
                
                Section("Participants") {
                    Button {
                        isShowingActionHub = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            isEditingAttendees = true
                        }
                    } label: {
                        HStack {
                            Label("Gérer les présences", systemImage: "person.2")
                            Spacer()
                            if let attendees = viewModel.meal.attendees {
                                Text("\(attendees.count) pers.")
                                    .foregroundColor(.secondary)
                            }
                        }
                        .foregroundColor(.primary)
                    }
                }
            }
            .navigationTitle(titleForHub())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") {
                        isShowingActionHub = false
                    }
                }
            }
        }
    }
    
    private func titleForHub() -> String {
        return "Options du \(viewModel.meal.type.rawValue)"
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
    
    // MARK: - Attendees Editor
    @ViewBuilder
    private func attendeesEditorSheet() -> some View {
        NavigationStack {
            VStack {
                Text("Modifier les présences pour recommander une recette adaptée aux personnes présentes.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                
                let binding = Binding<Set<Participant>>(
                    get: { Set(viewModel.meal.attendees ?? []) },
                    set: { newValue in
                        viewModel.meal.attendees = Array(newValue)
                        try? modelContext.save()
                        
                        // Si le repas a déjà une recette, on recommande de régénérer si les allergies matchent plus
                        // Pour simplifier, on régénère si on a modifié la présence.
                        // (On pourrait ajouter un dialogue de confirmation ici dans un cas plus élaboré)
                    }
                )
                
                ParticipantBubbleGroup(
                    allParticipants: allActiveParticipants,
                    selectedParticipants: binding
                )
                .padding()
                
                Spacer()
                
                if viewModel.meal.status == .planned && viewModel.meal.recipe != nil {
                    Button(action: {
                        withAnimation {
                            viewModel.regenerateMeal(context: modelContext)
                            isEditingAttendees = false
                        }
                    }) {
                        Text("Regénérer ce plat")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                            .padding(.horizontal)
                    }
                    .padding(.bottom)
                }
            }
            .navigationTitle("Présences")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Terminer") {
                        isEditingAttendees = false
                    }
                }
            }
        }
    }
}
