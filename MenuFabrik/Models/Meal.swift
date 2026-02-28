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
    case leftovers = "Restes"
    case shopping = "Courses"
    case skipped = "Sauté"
}

@Model
final class Meal {
    var id: UUID = UUID()
    var date: Date
    var type: MealTime
    var status: MealStatus
    var recipe: Recipe?
    @Relationship var selectedSideDishes: [SideDish]
    var menu: WeeklyMenu?
    @Relationship var attendees: [Participant]?
    
    init(date: Date, type: MealTime, status: MealStatus = .planned, recipe: Recipe? = nil, selectedSideDishes: [SideDish] = [], attendees: [Participant]? = []) {
        self.date = date
        self.type = type
        self.status = status
        self.recipe = recipe
        self.selectedSideDishes = selectedSideDishes
        self.attendees = attendees
    }
}
