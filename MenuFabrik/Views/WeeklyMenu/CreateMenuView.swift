import SwiftUI
import SwiftData

struct CreateMenuView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @State private var startDate: Date = Date()
    @State private var dayCount: Int = 7
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Configuration de la semaine")) {
                    DatePicker("Jour de début", selection: $startDate, displayedComponents: .date)
                    
                    Stepper("Nombre de jours : \(dayCount)", value: $dayCount, in: 1...14)
                }
                Section {
                    Button("Créer la semaine") {
                        createEmptyMenu()
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
                    .listRowInsets(EdgeInsets())
                }
            }
            .navigationTitle("Nouveau Menu")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }
    
    // On requête les participants actifs pour les ajouter par défaut
    @Query(filter: #Predicate<Participant> { $0.isActive == true })
    private var activeParticipants: [Participant]
    
    private func createEmptyMenu() {
        let newMenu = WeeklyMenu(startDate: startDate, dayCount: dayCount)
        modelContext.insert(newMenu)
        
        let calendar = Calendar.current
        let defaultAttendees = Array(activeParticipants)
        
        for i in 0..<dayCount {
            if let date = calendar.date(byAdding: .day, value: i, to: startDate) {
                let lunch = Meal(date: date, type: .lunch, attendees: defaultAttendees)
                let dinner = Meal(date: date, type: .dinner, attendees: defaultAttendees)
                lunch.menu = newMenu
                dinner.menu = newMenu
                modelContext.insert(lunch)
                modelContext.insert(dinner)
            }
        }
        
        dismiss()
    }
    
}
