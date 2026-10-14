import SwiftUI
import WebKit
import AppKit

private let homeURL = URL(string: "https://dehesaindex.com/")!

/// La web de Dehesa Index dentro de una ventana de Mac. Los enlaces a otras webs se abren en el navegador.
struct WebView: NSViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.allowsMagnification = true
        context.coordinator.web = view
        context.coordinator.listen()
        view.load(URLRequest(url: homeURL))
        return view
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var web: WKWebView?

        func listen() {
            let nc = NotificationCenter.default
            nc.addObserver(forName: .dehesaReload, object: nil, queue: .main) { [weak self] _ in
                guard let w = self?.web else { return }
                if w.url == nil { w.load(URLRequest(url: homeURL)) } else { w.reload() }
            }
            nc.addObserver(forName: .dehesaBack, object: nil, queue: .main) { [weak self] _ in self?.web?.goBack() }
            nc.addObserver(forName: .dehesaForward, object: nil, queue: .main) { [weak self] _ in self?.web?.goForward() }
            nc.addObserver(forName: .dehesaHome, object: nil, queue: .main) { [weak self] _ in self?.web?.load(URLRequest(url: homeURL)) }
        }

        private func isOwn(_ url: URL) -> Bool {
            guard let host = url.host?.lowercased() else { return true }
            return host == "dehesaindex.com" || host.hasSuffix(".dehesaindex.com")
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
            let scheme = url.scheme?.lowercased() ?? ""
            if scheme == "mailto" || scheme == "tel" {
                NSWorkspace.shared.open(url); decisionHandler(.cancel); return
            }
            let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
            if isMainFrame && (scheme == "http" || scheme == "https") && !isOwn(url) {
                NSWorkspace.shared.open(url); decisionHandler(.cancel); return
            }
            decisionHandler(.allow)
        }

        // Enlaces que piden ventana nueva (target=_blank)
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                if isOwn(url) { webView.load(navigationAction.request) } else { NSWorkspace.shared.open(url) }
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showOffline(webView) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showOffline(webView) }

        private func showOffline(_ webView: WKWebView) {
            let html = """
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <body style="font-family:-apple-system,sans-serif;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center;color:#555;background:#F7F4EC">
            <div><h2>Sin conexión · No connection</h2><p>Comprueba tu conexión a internet y pulsa ⌘R para recargar.<br>Check your internet connection and press ⌘R to reload.</p></div></body>
            """
            webView.loadHTMLString(html, baseURL: nil)
        }
    }
}
