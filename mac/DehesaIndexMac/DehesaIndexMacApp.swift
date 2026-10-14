import SwiftUI

extension Notification.Name {
    static let dehesaReload = Notification.Name("dehesaReload")
    static let dehesaBack = Notification.Name("dehesaBack")
    static let dehesaForward = Notification.Name("dehesaForward")
    static let dehesaHome = Notification.Name("dehesaHome")
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
            CommandMenu("Navegación") {
                Button("Inicio") { NotificationCenter.default.post(name: .dehesaHome, object: nil) }
                    .keyboardShortcut("h", modifiers: [.command, .shift])
                Button("Atrás") { NotificationCenter.default.post(name: .dehesaBack, object: nil) }
                    .keyboardShortcut("[", modifiers: .command)
                Button("Adelante") { NotificationCenter.default.post(name: .dehesaForward, object: nil) }
                    .keyboardShortcut("]", modifiers: .command)
                Divider()
                Button("Recargar") { NotificationCenter.default.post(name: .dehesaReload, object: nil) }
                    .keyboardShortcut("r", modifiers: .command)
            }
        }
    }
}
