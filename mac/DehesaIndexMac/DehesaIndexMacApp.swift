import SwiftUI

extension Notification.Name {
    static let dehesaReload = Notification.Name("dehesaReload")
    static let dehesaBack = Notification.Name("dehesaBack")
    static let dehesaForward = Notification.Name("dehesaForward")
    static let dehesaHome = Notification.Name("dehesaHome")
}

/// Textos de la app de Mac en los cuatro idiomas de la web: se elige el primero de los idiomas del sistema que sea es, en, fr o it (si no, inglés).
enum L10n {
    static let lang: String = {
        for l in Locale.preferredLanguages {
            let c = String(l.prefix(2))
            if ["es", "en", "fr", "it"].contains(c) { return c }
        }
        return "en"
    }()
    static func t(_ es: String, _ en: String, _ fr: String, _ it: String) -> String {
        switch lang {
        case "es": return es
        case "fr": return fr
        case "it": return it
        default: return en
        }
    }
}

@main
struct DehesaIndexMacApp: App {
    var body: some Scene {
        WindowGroup("Dehesa Index") {
            WebView()
                .frame(minWidth: 820, minHeight: 560)
        }
        .defaultSize(width: 1280, height: 860)
        .commands {
            CommandGroup(replacing: .newItem) { }
            CommandMenu(L10n.t("Navegación", "Navigation", "Navigation", "Navigazione")) {
                Button(L10n.t("Inicio", "Home", "Accueil", "Home")) { NotificationCenter.default.post(name: .dehesaHome, object: nil) }
                    .keyboardShortcut("h", modifiers: [.command, .shift])
                Button(L10n.t("Atrás", "Back", "Retour", "Indietro")) { NotificationCenter.default.post(name: .dehesaBack, object: nil) }
                    .keyboardShortcut("[", modifiers: .command)
                Button(L10n.t("Adelante", "Forward", "Avancer", "Avanti")) { NotificationCenter.default.post(name: .dehesaForward, object: nil) }
                    .keyboardShortcut("]", modifiers: .command)
                Divider()
                Button(L10n.t("Recargar", "Reload", "Recharger", "Ricarica")) { NotificationCenter.default.post(name: .dehesaReload, object: nil) }
                    .keyboardShortcut("r", modifiers: .command)
            }
        }
    }
}
