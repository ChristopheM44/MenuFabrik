import SwiftUI
import SwiftData

struct MealDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Bindable var meal: Meal
    
    @State private var recipeToEdit: Recipe?
    
    var body: some View {
        NavigationStack {
            Form {
                if let recipe = meal.recipe {
                    Section(header: Text("Informations de la recette")) {
                        HStack {
                            Text("Nom")
                            Spacer()
                            Text(recipe.name)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Text("Catégorie")
                            Spacer()
                            Text(recipe.category.rawValue)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Text("Préparation")
                            Spacer()
                            Text("\(recipe.prepTime) min")
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Text("Note")
                            Spacer()
                            if recipe.rating > 0 {
                                StarRatingView(rating: .constant(recipe.rating))
                                    .allowsHitTesting(false)
                            } else {
                                Text("Non notée")
                                    .foregroundColor(.secondary)
                                    .italic()
                            }
                        }
                    }
                    
                    if !recipe.instructions.isEmpty {
                        Section(header: Text("Instructions")) {
                            Text(recipe.instructions)
                                .font(.body)
                                .padding(.vertical, 4)
                        }
                    } else {
                        Section(header: Text("Instructions")) {
                            Text("Aucune instruction disponible pour cette recette.")
                                .italic()
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    if let urlString = recipe.sourceURL, !urlString.trimmingCharacters(in: .whitespaces).isEmpty {
                        Section {
                            RecipeSourceLinkButton(urlString: urlString)
                        }
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                    }
                    
                    Section(header: Text("Allergènes de la recette")) {
                        if recipe.allergens.isEmpty {
                            Text("Aucun allergène déclaré")
                                .foregroundColor(.secondary)
                                .italic()
                        } else {
                            let allergensText = recipe.allergens.map { $0.name }.joined(separator: ", ")
                            Text(allergensText)
                                .foregroundColor(.red)
                        }
                    }
                } else {
                    Section {
                        Text("Aucune recette planifiée pour ce repas.")
                            .italic()
                            .foregroundColor(.secondary)
                    }
                }
                
                if meal.recipe != nil {
                    // Re-use SideDishInputView to allow multiple side dishes selection
                    SideDishInputView(sides: $meal.selectedSideDishes)
                }
                
                Section {
                    Button("Fermer") {
                        try? modelContext.save()
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle(titleForMeal)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") {
                        try? modelContext.save()
                        dismiss()
                    }
                }
                
                if meal.recipe != nil {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Modifier") {
                            recipeToEdit = meal.recipe
                        }
                    }
                }
            }
            .sheet(item: $recipeToEdit) { recipe in
                RecipeFormView(recipe: recipe)
            }
        }
    }
    
    private var titleForMeal: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.setLocalizedDateFormatFromTemplate("EEEE d MMM")
        let dateStr = formatter.string(from: meal.date).capitalized
        return "\(meal.type.rawValue) - \(dateStr)"
    }
}
