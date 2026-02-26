import Foundation
import SwiftData

@Model
final class Participant {
    var id: UUID = UUID()
    var name: String
    var isActive: Bool
    var allergies: [String] // Noms des allergènes pour filtrer facilement
    
    init(name: String, isActive: Bool = true, allergies: [String] = []) {
        self.name = name
        self.isActive = isActive
        self.allergies = allergies
    }
}
