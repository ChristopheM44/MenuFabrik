import SwiftUI
import SwiftData

struct RecipeFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    var recipe: Recipe?
    
    @State private var name: String = ""
    @State private var prepTime: Int = 30
    @State private var mealType: MealType = .both
    @State private var category: RecipeCategory = .other
    @State private var instructions: String = ""
    @State private var rating: Int = 0
    @State private var allergens: [String] = []
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Informations générales")) {
                    TextField("Nom de la recette", text: $name)
                    Stepper("Temps de préparation: \(prepTime) min", value: $prepTime, in: 5...180, step: 5)
                    Picker("Type de Repas", selection: $mealType) {
                        ForEach(MealType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    Picker("Catégorie", selection: $category) {
                        ForEach(RecipeCategory.allCases, id: \.self) { cat in
                            Text(cat.rawValue).tag(cat)
                        }
                    }
                }
                
                Section(header: Text("Notation")) {
                    StarRatingView(rating: $rating)
                }
                
                AllergenInputView(allergens: $allergens)
                
                Section(header: Text("Instructions")) {
                    TextEditor(text: $instructions)
                        .frame(minHeight: 100)
                }
            }
            .navigationTitle(recipe == nil ? "Nouvelle Recette" : "Modifier la Recette")
            .navigationBarItems(
                leading: Button("Annuler") { dismiss() },
                trailing: Button("Enregistrer") { save() }.disabled(name.isEmpty)
            )
            .onAppear {
                if let recipe = recipe {
                    name = recipe.name
                    prepTime = recipe.prepTime
                    mealType = recipe.mealType
                    category = recipe.category
                    instructions = recipe.instructions
                    allergens = recipe.allergens
                    rating = recipe.rating
                }
            }
        }
    }
    
    private func save() {
        if let recipe = recipe {
            recipe.name = name
            recipe.prepTime = prepTime
            recipe.mealType = mealType
            recipe.category = category
            recipe.instructions = instructions
            recipe.allergens = allergens
            recipe.rating = rating
        } else {
            let newRecipe = Recipe(name: name, prepTime: prepTime, mealType: mealType, category: category, allergens: allergens, instructions: instructions, rating: rating)
            modelContext.insert(newRecipe)
        }
        dismiss()
    }
}
