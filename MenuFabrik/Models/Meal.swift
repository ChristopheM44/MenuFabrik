import Foundation
import SwiftData

enum MealTime: String, Codable, CaseIterable {
    case lunch = "Midi"
    case dinner = "Soir"
}

@Model
final class Meal {
    var id: UUID = UUID()
    var date: Date
    var type: MealTime
    var recipe: Recipe?
    var menu: WeeklyMenu?
    
    init(date: Date, type: MealTime, recipe: Recipe? = nil) {
        self.date = date
        self.type = type
        self.recipe = recipe
    }
}
