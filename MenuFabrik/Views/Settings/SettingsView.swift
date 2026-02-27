import SwiftUI
import SwiftData
internal import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var showFileImporter = false
    @State private var exportedFileURL: URL?
    @State private var showMessage = false
    @State private var messageText = ""

    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Données de l'Application")) {
                    NavigationLink(destination: AllergenListView()) {
                        Label("Gérer les Allergènes", systemImage: "list.dash")
                    }
                    NavigationLink(destination: SideDishListView()) {
                        Label("Gérer les Accompagnements", systemImage: "takeoutbag.and.cup.and.straw")
                    }
                }
                
                Section(header: Text("Sauvegarde")) {
                    Button(action: exportData) {
                        Label("Générer un fichier d'export (JSON)", systemImage: "doc.badge.plus")
                    }
                    
                    if let url = exportedFileURL {
                        ShareLink(item: url) {
                            Label("Partager / Sauvegarder l'export", systemImage: "square.and.arrow.up")
                        }
                    }
                    
                    Button(action: { showFileImporter = true }) {
                        Label("Importer des données", systemImage: "square.and.arrow.down")
                    }
                }
                
                Section(header: Text("Zone Dangereuse")) {
                    Button(role: .destructive) {
                        DataSeeder.seed(context: modelContext)
                        messageText = "Les données ont été réinitialisées avec succès (accompagnements, allergènes et recettes de base)."
                        showMessage = true
                    } label: {
                        Label("Réinitialiser les données (DataSeeder)", systemImage: "arrow.triangle.2.circlepath")
                    }
                }
            }
            .navigationTitle("Réglages")
            .fileImporter(
                isPresented: $showFileImporter,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                importData(from: result)
            }
            .alert("Information", isPresented: $showMessage) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(messageText)
            }
        }
    }
    
    private func exportData() {
        let service = DataExportService(context: modelContext)
        do {
            let data = try service.exportData()
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("MenuFabrik_Export.json")
            try data.write(to: url)
            exportedFileURL = url
            messageText = "Données générées ! Utilisez le bouton Partager pour les sauvegarder."
            showMessage = true
        } catch {
            messageText = "Erreur lors de l'export: \(error.localizedDescription)"
            showMessage = true
        }
    }
    
    private func importData(from result: Result<[URL], Error>) {
        guard let url = try? result.get().first else { return }
        
        let service = DataExportService(context: modelContext)
        do {
            guard url.startAccessingSecurityScopedResource() else {
               messageText = "Impossible d'accéder au fichier."
               showMessage = true
               return
            }
            defer { url.stopAccessingSecurityScopedResource() }
            
            let data = try Data(contentsOf: url)
            try service.importData(from: data)
            messageText = "Données importées avec succès !"
            showMessage = true
        } catch {
            messageText = "Erreur lors de l'import: \(error.localizedDescription)"
            showMessage = true
        }
    }
}
