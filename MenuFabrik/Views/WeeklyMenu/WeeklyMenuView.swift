import SwiftUI
import SwiftData

struct WeeklyMenuView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WeeklyMenu.startDate, order: .reverse) private var menus: [WeeklyMenu]
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
    @State private var showingCreateSheet = false
    
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
}
