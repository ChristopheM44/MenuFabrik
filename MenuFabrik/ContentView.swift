import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    
    var body: some View {
        TabView {
            WeeklyMenuView()
                .tabItem {
                    Label("Menu", systemImage: "calendar")
                }
            
            RecipeListView()
                .tabItem {
                    Label("Recettes", systemImage: "book")
                }
            
            ParticipantListView()
                .tabItem {
                    Label("Foyer", systemImage: "person.2")
                }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: Recipe.self, inMemory: true)
}
