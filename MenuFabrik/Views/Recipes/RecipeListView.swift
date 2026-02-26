import SwiftUI
import SwiftData

struct RecipeListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Recipe.name) private var recipes: [Recipe]
    
    @State private var showingAddSheet = false
    @State private var recipeToEdit: Recipe?
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(recipes) { recipe in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(recipe.name)
                                .font(.headline)
                            Spacer()
                            if recipe.rating > 0 {
                                HStack(spacing: 2) {
                                    Text("\(recipe.rating)")
                                    Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                }
                                .font(.caption)
                            }
                        }
                        HStack {
                            Text("\(recipe.prepTime) min")
                            Text("•")
                            Text(recipe.mealType.rawValue)
                            Text("•")
                            Text(recipe.category.rawValue)
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        recipeToEdit = recipe
                    }
                }
                .onDelete(perform: deleteRecipes)
            }
            .navigationTitle("Mes Recettes")
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button(action: {
                        DataSeeder.seed(context: modelContext)
                    }) {
                        Label("Recharger Data", systemImage: "arrow.triangle.2.circlepath")
                    }
                    
                    Button(action: { showingAddSheet = true }) {
                        Label("Ajouter", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                RecipeFormView(recipe: nil)
            }
            .sheet(item: $recipeToEdit) { recipe in
                RecipeFormView(recipe: recipe)
            }
            .overlay {
                if recipes.isEmpty {
                    VStack(spacing: 20) {
                        ContentUnavailableView(
                            "Aucune Recette",
                            systemImage: "fork.knife",
                            description: Text("Ajoutez des recettes pour pouvoir générer des menus.")
                        )
                        
                        Button("Charger les données de test") {
                            DataSeeder.seed(context: modelContext)
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.bottom, 40)
                    }
                }
            }
        }
    }
    
    private func deleteRecipes(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(recipes[index])
        }
    }
}
