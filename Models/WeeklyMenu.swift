import Foundation
import SwiftData

@Model
final class WeeklyMenu {
    var id: UUID = UUID()
    var startDate: Date
    var dayCount: Int
    @Relationship(deleteRule: .cascade, inverse: \Meal.menu) var meals: [Meal]?
    
    init(startDate: Date, dayCount: Int) {
        self.startDate = startDate
        self.dayCount = dayCount
    }
}
