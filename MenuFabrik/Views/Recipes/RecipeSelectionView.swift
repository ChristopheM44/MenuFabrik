import SwiftUI
import SwiftData

struct RecipeSelectionView: View {
    let meal: Meal
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Query(sort: \Recipe.name) private var allRecipes: [Recipe]
    @State private var searchText = ""
    
    var filteredRecipes: [Recipe] {
        if searchText.isEmpty {
            return allRecipes
        } else {
            return allRecipes.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        NavigationStack {
            List(filteredRecipes) { recipe in
                Button {
                    select(recipe)
                } label: {
                    HStack {
                        Text(recipe.name)
                            .foregroundColor(.primary)
                        Spacer()
                        if meal.recipe?.id == recipe.id {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
            .navigationTitle("Choisir une recette")
            .searchable(text: $searchText, prompt: "Rechercher...")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func select(_ recipe: Recipe) {
        meal.recipe = recipe
        meal.status = .planned
        if let randomSide = recipe.suggestedSides.randomElement() {
            meal.selectedSideDishes = [randomSide]
        } else {
            meal.selectedSideDishes = []
        }
        try? modelContext.save()
        dismiss()
    }
}
