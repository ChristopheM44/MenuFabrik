//
//  MenuFabrikApp.swift
//  MenuFabrik
//
//  Created by Christophe Martin on 26/02/2026.
//

import SwiftUI
import SwiftData

@main
struct MenuFabrikApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Participant.self, Allergen.self, Recipe.self, WeeklyMenu.self, Meal.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
