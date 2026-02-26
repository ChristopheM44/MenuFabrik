import SwiftUI
import SwiftData

struct WeeklyMenuGrid: View {
    let menu: WeeklyMenu
    
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
        guard let meals = menu.meals else { return [] }
        let grouped = Dictionary(grouping: meals) { meal in
            Calendar.current.startOfDay(for: meal.date)
        }
        return grouped.map { DayMeals(date: $0.key, meals: $0.value) }
            .sorted(by: { $0.date < $1.date })
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "EEEE d MMM"
        return formatter.string(from: date).capitalized
    }
}
