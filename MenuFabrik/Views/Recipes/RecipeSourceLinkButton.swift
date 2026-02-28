import SwiftUI

enum RecipeSourcePlatform {
    case cookidoo
    case cookomix
    case marmiton
    case web
    
    var displayName: String {
        switch self {
        case .cookidoo: return "Ouvrir dans Cookidoo"
        case .cookomix: return "Ouvrir dans Cookomix"
        case .marmiton: return "Ouvrir sur Marmiton"
        case .web: return "Voir la recette web"
        }
    }
    
    var iconName: String {
        switch self {
        case .cookidoo: return "logo_cookidoo"
        case .cookomix: return "logo_cookomix"
        case .marmiton: return "logo_marmiton"
        case .web: return "safari" // SF Symbol natif
        }
    }
    
    var isSFSymbol: Bool {
        self == .web
    }
    
    static func detect(from urlString: String) -> RecipeSourcePlatform {
        guard let url = URL(string: urlString), let host = url.host?.lowercased() else {
            return .web
        }
        if host.contains("cookidoo") { return .cookidoo }
        if host.contains("cookomix") { return .cookomix }
        if host.contains("marmiton") { return .marmiton }
        return .web
    }
}

struct RecipeSourceLinkButton: View {
    let urlString: String
    
    var body: some View {
        if let url = URL(string: urlString) {
            let platform = RecipeSourcePlatform.detect(from: urlString)
            
            Link(destination: url) {
                HStack(spacing: 12) {
                    if platform.isSFSymbol {
                        Image(systemName: platform.iconName)
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                    } else {
                        // Utilise une icône personnalisée des Assets
                        Image(platform.iconName)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 24, height: 24)
                            .cornerRadius(4)
                    }
                    
                    Text(platform.displayName)
                        .font(.headline)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .cornerRadius(12)
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        RecipeSourceLinkButton(urlString: "https://cookidoo.fr/recipes/recipe/fr-FR/r68754")
        RecipeSourceLinkButton(urlString: "https://www.cookomix.com/recettes/pate-a-crepes-thermomix/")
        RecipeSourceLinkButton(urlString: "https://www.marmiton.org/recettes/recette_pates-a-la-carbonara_80453.aspx")
        RecipeSourceLinkButton(urlString: "https://monblogperso.com/recette-secrete")
    }
    .padding()
}
