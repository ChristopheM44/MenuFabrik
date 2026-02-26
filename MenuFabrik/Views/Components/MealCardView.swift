import SwiftUI
import SwiftData

struct MealCardView: View {
    let meal: Meal
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(meal.type.rawValue)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            
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
        }
        .padding()
        .frame(height: 140)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
        .contextMenu {
            Button {
                regenerateMeal()
            } label: {
                Label("Changer de recette", systemImage: "arrow.triangle.2.circlepath")
            }
        }
    }
    
    private func regenerateMeal() {
        // En vrai l'idéal serait d'inverser la dépendance ou d'utiliser une Action dans la db
        // mais vu la taille du MVP, c'est acceptable de recréer le service ici pour l'action ponctuelle.
        guard let context = meal.modelContext else { return }
        let generator = MenuGeneratorService(context: context)
        generator.generate(for: meal)
    }
}
