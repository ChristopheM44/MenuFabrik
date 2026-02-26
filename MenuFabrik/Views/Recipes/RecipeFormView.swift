import SwiftUI
import SwiftData

struct RecipeFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @State private var viewModel: RecipeFormViewModel
    
    init(recipe: Recipe? = nil) {
        _viewModel = State(initialValue: RecipeFormViewModel(recipe: recipe))
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Informations générales")) {
                    TextField("Nom de la recette", text: $viewModel.name)
                    Stepper("Temps de préparation: \(viewModel.prepTime) min", value: $viewModel.prepTime, in: 5...180, step: 5)
                    Picker("Type de Repas", selection: $viewModel.mealType) {
                        ForEach(MealType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    Picker("Catégorie", selection: $viewModel.category) {
                        ForEach(RecipeCategory.allCases, id: \.self) { cat in
                            Text(cat.rawValue).tag(cat)
                        }
                    }
                }
                
                Section(header: Text("Notation")) {
                    StarRatingView(rating: $viewModel.rating)
                }
                
                AllergenInputView(allergens: $viewModel.allergens)
                
                Section(header: Text("Instructions")) {
                    TextEditor(text: $viewModel.instructions)
                        .frame(minHeight: 100)
                }
                
                if viewModel.editingRecipe != nil {
                    Section {
                        Button("Supprimer la recette", role: .destructive) {
                            if let recipe = viewModel.editingRecipe {
                                modelContext.delete(recipe)
                                try? modelContext.save()
                                dismiss()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
            }
            .navigationTitle(viewModel.editingRecipe == nil ? "Nouvelle Recette" : "Modifier la Recette")
            .navigationBarItems(
                leading: Button("Annuler") { dismiss() },
                trailing: Button("Enregistrer") {
                    viewModel.save(context: modelContext)
                    dismiss()
                }
                .disabled(viewModel.isSaveDisabled)
            )
        }
    }
}
