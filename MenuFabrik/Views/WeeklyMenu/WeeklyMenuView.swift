import SwiftUI
import SwiftData

struct WeeklyMenuView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Meal.date, order: .forward) private var meals: [Meal]
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
    @State private var showingCreateSheet = false
    @State private var isGenerating = false
    
    var body: some View {
        NavigationStack {
            Group {
                if !meals.isEmpty {
                    ScrollView {
                        if horizontalSizeClass == .compact {
                            WeeklyMenuList(meals: meals)
                        } else {
                            WeeklyMenuGrid(meals: meals)
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Aucun Menu",
                        systemImage: "calendar.badge.plus",
                        description: Text("Configurez votre semaine pour générer un menu.")
                    )
                }
            }
            .overlay(alignment: .bottom) {
                if !meals.isEmpty {
                    Button(action: {
                        generateRemainingMeals(for: meals)
                    }) {
                        HStack {
                            Image(systemName: "sparkles")
                            Text("Générer les repas manquants")
                                .fontWeight(.bold)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                        .shadow(radius: 5)
                        .padding(.horizontal)
                        .padding(.bottom, 8)
                    }
                    .disabled(isGenerating)
                }
            }
            .navigationTitle("Menu de la Semaine")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingCreateSheet = true }) {
                        Label("Nouveau Menu", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateSheet) {
                CreateMenuView()
            }
        }
    }
    
    private func generateRemainingMeals(for meals: [Meal]) {
        isGenerating = true
        let generator = MenuGeneratorService(context: modelContext)
        
        // Simulating a bit of loading for UX
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation {
                generator.generate(for: meals)
                isGenerating = false
            }
        }
    }
}
