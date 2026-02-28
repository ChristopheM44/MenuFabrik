import SwiftUI
import SwiftData

struct WeeklyMenuView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WeeklyMenu.startDate, order: .reverse) private var menus: [WeeklyMenu]
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
    @State private var showingCreateSheet = false
    @State private var isGenerating = false
    
    var body: some View {
        NavigationStack {
            Group {
                if let currentMenu = menus.first {
                    ScrollView {
                        if horizontalSizeClass == .compact {
                            WeeklyMenuList(menu: currentMenu)
                        } else {
                            WeeklyMenuGrid(menu: currentMenu)
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
                if let currentMenu = menus.first {
                    Button(action: {
                        generateRemainingMeals(for: currentMenu)
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
    
    private func generateRemainingMeals(for menu: WeeklyMenu) {
        isGenerating = true
        let generator = MenuGeneratorService(context: modelContext)
        
        // Simulating a bit of loading for UX
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation {
                generator.generate(for: menu)
                isGenerating = false
            }
        }
    }
}
