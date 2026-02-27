import Foundation
import SwiftData

@Model
final class Participant {
    var id: UUID = UUID()
    var name: String
    var isActive: Bool
    var allergies: [Allergen] // Relations fortes vers les allergènes
    
    init(name: String, isActive: Bool = true, allergies: [Allergen] = []) {
        self.name = name
        self.isActive = isActive
        self.allergies = allergies
    }
}
