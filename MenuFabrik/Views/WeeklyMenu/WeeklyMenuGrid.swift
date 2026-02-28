import SwiftUI
import SwiftData

struct WeeklyMenuGrid: View {
    let meals: [Meal]
    @Environment(\.modelContext) private var modelContext
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(alignment: .top, spacing: 16) {
                // Group meals by date, sort by date
                let days = groupedAndSortedDays()
                
                ForEach(days, id: \.date) { day in
                    VStack(spacing: 16) {
                        Text(formatDate(day.date))
                            .font(.headline)
                            .padding(.bottom, 8)
                        
                        if let lunch = day.meals.first(where: { $0.type == .lunch }) {
                            MealCardView(meal: lunch)
                        }
                        
                        if let dinner = day.meals.first(where: { $0.type == .dinner }) {
                            MealCardView(meal: dinner)
                        }
                        
                        // Bouton de suppression discret pour la grid
                        Button(role: .destructive) {
                            deleteDay(day.meals)
                        } label: {
                            Label("Supprimer le jour", systemImage: "trash")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                        .padding(.top, 8)
                    }
                    .frame(width: 220)
                }
            }
            .padding()
        }
    }
    
    struct DayMeals {
        let date: Date
        let meals: [Meal]
    }
    
    private func groupedAndSortedDays() -> [DayMeals] {
        let grouped = Dictionary(grouping: meals) { meal in
            Calendar.current.startOfDay(for: meal.date)
        }
        return grouped.map { DayMeals(date: $0.key, meals: $0.value) }
            .sorted(by: { $0.date < $1.date })
    }
    
    private func deleteDay(_ mealsToDelete: [Meal]) {
        for meal in mealsToDelete {
            modelContext.delete(meal)
        }
        try? modelContext.save()
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "EEEE d MMM"
        return formatter.string(from: date).capitalized
    }
}
