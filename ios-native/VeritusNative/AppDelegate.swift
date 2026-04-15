import Foundation
import UIKit
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    center.setNotificationCategories([
      UNNotificationCategory(
        identifier: "VERITUS_IMMERSIVE_ALERT",
        actions: [],
        intentIdentifiers: [],
        options: []
      )
    ])
    return true
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification
  ) async -> UNNotificationPresentationOptions {
    [.banner, .list, .sound]
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse
  ) async {
    NotificationCenter.default.post(
      name: .veritusImmersiveAlertOpened,
      object: nil,
      userInfo: response.notification.request.content.userInfo
    )
  }
}

extension Notification.Name {
  static let veritusImmersiveAlertOpened = Notification.Name("veritusImmersiveAlertOpened")
}