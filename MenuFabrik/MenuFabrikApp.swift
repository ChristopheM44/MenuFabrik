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
            Participant.self, Allergen.self, SideDish.self, Recipe.self, Meal.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            print("Erreur de chargement du modèle: \(error). Suppression de l'ancienne base pour forcer la mise à jour du schéma.")
            let url = modelConfiguration.url
            try? FileManager.default.removeItem(at: url)
            try? FileManager.default.removeItem(at: url.deletingPathExtension().appendingPathExtension("store-shm"))
            try? FileManager.default.removeItem(at: url.deletingPathExtension().appendingPathExtension("store-wal"))
            
            do {
                return try ModelContainer(for: schema, configurations: [modelConfiguration])
            } catch {
                fatalError("Impossible de recréer le ModelContainer même après suppression : \(error)")
            }
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
