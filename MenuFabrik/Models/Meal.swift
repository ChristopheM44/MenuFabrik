import Foundation
import SwiftData

enum MealTime: String, Codable, CaseIterable {
    case lunch = "Midi"
    case dinner = "Soir"
}

enum MealStatus: String, Codable, CaseIterable {
    case planned = "Prévu"
    case restaurant = "Restaurant"
    case absent = "Absent"
    case work = "Travail"
    case skipped = "Sauté"
}

@Model
final class Meal {
    var id: UUID = UUID()
    var date: Date
    var type: MealTime
    var status: MealStatus
    var recipe: Recipe?
    var selectedSideDish: String?
    var menu: WeeklyMenu?
    
    init(date: Date, type: MealTime, status: MealStatus = .planned, recipe: Recipe? = nil, selectedSideDish: String? = nil) {
        self.date = date
        self.type = type
        self.status = status
        self.recipe = recipe
        self.selectedSideDish = selectedSideDish
    }
}
