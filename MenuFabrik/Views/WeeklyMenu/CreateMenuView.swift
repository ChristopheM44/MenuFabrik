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
        let calendar = Calendar.current
        let defaultAttendees = Array(activeParticipants)
        let startOfDay = calendar.startOfDay(for: startDate)
        
        // On récupère tous les repas existants pour éviter les doublons
        let descriptor = FetchDescriptor<Meal>()
        let existingMeals = (try? modelContext.fetch(descriptor)) ?? []
        
        for i in 0..<dayCount {
            if let date = calendar.date(byAdding: .day, value: i, to: startOfDay) {
                
                // Recherche si un repas existe déjà (Midi et Soir)
                let hasLunch = existingMeals.contains { calendar.isDate($0.date, inSameDayAs: date) && $0.type == .lunch }
                let hasDinner = existingMeals.contains { calendar.isDate($0.date, inSameDayAs: date) && $0.type == .dinner }
                
                if !hasLunch {
                    let lunch = Meal(date: date, type: .lunch, attendees: defaultAttendees)
                    modelContext.insert(lunch)
                }
                
                if !hasDinner {
                    let dinner = Meal(date: date, type: .dinner, attendees: defaultAttendees)
                    modelContext.insert(dinner)
                }
            }
        }
        
        try? modelContext.save()
        dismiss()
    }
    
}
