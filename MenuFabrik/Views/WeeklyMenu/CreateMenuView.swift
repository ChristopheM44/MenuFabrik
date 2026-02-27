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
                    Button("Créer et Générer le Menu") {
                        createEmptyMenuAndGenerate()
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
    
    private func createEmptyMenuAndGenerate() {
        // 1. Create the new Menu object
        let newMenu = WeeklyMenu(startDate: startDate, dayCount: dayCount)
        modelContext.insert(newMenu)
        
        // 2. Create Empty Meals
        let calendar = Calendar.current
        for i in 0..<dayCount {
            if let date = calendar.date(byAdding: .day, value: i, to: startDate) {
                let lunch = Meal(date: date, type: .lunch)
                let dinner = Meal(date: date, type: .dinner)
                lunch.menu = newMenu
                dinner.menu = newMenu
                modelContext.insert(lunch)
                modelContext.insert(dinner)
            }
        }
        
        // 3. Appel au MenuGeneratorService pour assigner les recettes
        let generator = MenuGeneratorService(context: modelContext)
        generator.generate(for: newMenu)
        
        dismiss()
    }
}
