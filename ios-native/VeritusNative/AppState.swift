import Foundation

@MainActor
final class AppState: ObservableObject {
  enum Tab: Hashable {
    case commandCenter
    case alerts
  }

  @Published var selectedTab: Tab = .commandCenter
  @Published var activeAlert: ImmersiveAlert?
  @Published var pendingCommandURL: URL?

  func handleNotificationPayload(_ payload: [AnyHashable: Any]?) {
    guard let payload, let alert = ImmersiveAlert(payload: payload) else {
      return
    }

    selectedTab = .alerts
    activeAlert = alert
  }

  func preview(_ program: NotificationProgram) {
    activeAlert = ImmersiveAlert(program: program)
  }

  func run(alert: ImmersiveAlert) {
    selectedTab = .commandCenter
    pendingCommandURL = AppConfig.commandCenterURL?.appendingVeritusPrompt(
      alert.prompt,
      autorun: true,
    )
    activeAlert = nil
  }

  func dismissAlert() {
    activeAlert = nil
  }
}

private extension URL {
  func appendingVeritusPrompt(_ prompt: String, autorun: Bool) -> URL? {
    guard var components = URLComponents(url: self, resolvingAgainstBaseURL: false) else {
      return nil
    }

    components.queryItems = [
      URLQueryItem(name: "prompt", value: prompt),
      URLQueryItem(name: "autorun", value: autorun ? "1" : "0"),
    ]
    return components.url
  }
}