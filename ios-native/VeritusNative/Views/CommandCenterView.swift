import SwiftUI
import WebKit

private final class CommandCenterWebViewStore: ObservableObject {
  let webView: WKWebView = {
    let configuration = WKWebViewConfiguration()
    configuration.defaultWebpagePreferences.allowsContentJavaScript = true

    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.allowsBackForwardNavigationGestures = true
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    return webView
  }()

  private(set) var hasLoadedInitialPage = false

  func loadInitialPageIfNeeded() {
    guard hasLoadedInitialPage == false, let url = AppConfig.commandCenterURL else {
      return
    }

    load(url: url)
    hasLoadedInitialPage = true
  }

  func load(url: URL) {
    webView.load(URLRequest(url: url))
  }
}

struct CommandCenterView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var webStore = CommandCenterWebViewStore()

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [Color.black, Color(red: 0.03, green: 0.05, blue: 0.11)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      VStack(spacing: 16) {
        VStack(alignment: .leading, spacing: 10) {
          Text("Veritus Native")
            .font(.caption)
            .textCase(.uppercase)
            .foregroundStyle(.cyan)
          Text("Your AI cockpit lives inside a private iPhone shell.")
            .font(.title2.weight(.semibold))
            .foregroundStyle(.white)
          Text("Log in here once. The Alerts tab reuses this authenticated web session to sync your immersive alert programs.")
            .font(.footnote)
            .foregroundStyle(.white.opacity(0.68))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 24, style: .continuous)
            .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )

        if AppConfig.commandCenterURL == nil {
          VStack(alignment: .leading, spacing: 12) {
            Text("Set VeritusBaseURL in Info.plist before building this app.")
              .font(.headline)
              .foregroundStyle(.white)
            Text("Point it to your deployed Veritus host, for example `https://your-domain.com`. The native shell will open `/dashboard/ai` automatically.")
              .font(.footnote)
              .foregroundStyle(.white.opacity(0.68))
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(20)
          .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        } else {
          WebContainerView(webView: webStore.webView)
            .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
            .overlay(
              RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.24), radius: 24, y: 12)
        }
      }
      .padding(18)
    }
    .onAppear {
      webStore.loadInitialPageIfNeeded()
    }
    .onChange(of: appState.pendingCommandURL) { nextURL in
      guard let nextURL else { return }
      webStore.load(url: nextURL)
      appState.pendingCommandURL = nil
    }
  }
}

private struct WebContainerView: UIViewRepresentable {
  let webView: WKWebView

  func makeUIView(context: Context) -> WKWebView {
    webView
  }

  func updateUIView(_ uiView: WKWebView, context: Context) {
  }
}