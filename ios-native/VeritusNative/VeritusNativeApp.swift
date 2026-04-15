import SwiftUI

@main
struct VeritusNativeApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  @StateObject private var appState = AppState()
  @StateObject private var programService = NotificationProgramService()

  var body: some Scene {
    WindowGroup {
      TabView(selection: $appState.selectedTab) {
        CommandCenterView()
          .tabItem {
            Label("Command", systemImage: "sparkles.rectangle.stack")
          }
          .tag(AppState.Tab.commandCenter)

        AlertProgramsView()
          .tabItem {
            Label("Alerts", systemImage: "bell.badge.waveform")
          }
          .tag(AppState.Tab.alerts)
      }
      .preferredColorScheme(.dark)
      .environmentObject(appState)
      .environmentObject(programService)
      .fullScreenCover(item: $appState.activeAlert) { alert in
        ImmersiveAlertView(alert: alert)
      }
      .onReceive(NotificationCenter.default.publisher(for: .veritusImmersiveAlertOpened)) {
        notification in
        appState.handleNotificationPayload(notification.userInfo)
      }
    }
  }
}