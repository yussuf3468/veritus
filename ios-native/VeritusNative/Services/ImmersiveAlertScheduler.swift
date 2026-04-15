import Foundation
import UserNotifications

final class ImmersiveAlertScheduler {
  static let shared = ImmersiveAlertScheduler()

  private let center = UNUserNotificationCenter.current()

  private init() {}

  func requestAuthorization() async -> Bool {
    do {
      return try await center.requestAuthorization(options: [.alert, .sound, .badge])
    } catch {
      return false
    }
  }

  func schedule(programs: [NotificationProgram]) async throws {
    let identifiers = programs.flatMap(\.notificationRequestIdentifiers)
    center.removePendingNotificationRequests(withIdentifiers: identifiers)

    for program in programs where program.isEnabled {
      for request in requests(for: program) {
        try await add(request)
      }
    }
  }

  func scheduleSnooze(for alert: ImmersiveAlert, minutes: Int) async throws {
    let content = UNMutableNotificationContent()
    content.title = alert.title
    content.body = alert.detail
    content.sound = .default
    content.categoryIdentifier = "VERITUS_IMMERSIVE_ALERT"
    content.interruptionLevel = .timeSensitive
    content.userInfo = [
      "program_id": alert.id,
      "title": alert.title,
      "detail": alert.detail,
      "prompt": alert.prompt,
    ]

    let request = UNNotificationRequest(
      identifier: "veritus.snooze.\(UUID().uuidString)",
      content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(minutes * 60), repeats: false)
    )

    try await add(request)
  }

  private func requests(for program: NotificationProgram) -> [UNNotificationRequest] {
    switch program.scheduleType {
    case .once:
      guard let dateTrigger = makeOneShotTrigger(program) else { return [] }
      return [
        UNNotificationRequest(
          identifier: program.notificationRequestIdentifiers.first ?? "veritus.alert.\(program.id)",
          content: makeContent(for: program),
          trigger: dateTrigger
        )
      ]
    case .daily:
      guard let time = timeComponents(from: program.scheduleTime) else { return [] }
      return [
        UNNotificationRequest(
          identifier: program.notificationRequestIdentifiers.first ?? "veritus.alert.\(program.id)",
          content: makeContent(for: program),
          trigger: UNCalendarNotificationTrigger(dateMatching: time, repeats: true)
        )
      ]
    case .weekly:
      guard let time = timeComponents(from: program.scheduleTime) else { return [] }
      let weekdays = program.weekdays.isEmpty ? [1] : program.weekdays

      return weekdays.map { weekday in
        var components = time
        components.weekday = weekday
        return UNNotificationRequest(
          identifier: "veritus.alert.\(program.id).\(weekday)",
          content: makeContent(for: program),
          trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        )
      }
    }
  }

  private func makeContent(for program: NotificationProgram) -> UNMutableNotificationContent {
    let content = UNMutableNotificationContent()
    content.title = program.name
    content.body = program.description ?? program.prompt
    content.sound = .default
    content.categoryIdentifier = "VERITUS_IMMERSIVE_ALERT"
    content.interruptionLevel = program.deliveryMode == .standard ? .active : .timeSensitive
    content.userInfo = [
      "program_id": program.id,
      "title": program.name,
      "detail": program.description ?? program.scheduleSummary,
      "prompt": program.prompt,
    ]
    return content
  }

  private func makeOneShotTrigger(_ program: NotificationProgram) -> UNCalendarNotificationTrigger? {
    guard
      let scheduleDate = program.scheduleDate,
      let dateParts = parseDate(scheduleDate),
      let timeParts = timeComponents(from: program.scheduleTime)
    else {
      return nil
    }

    var components = timeParts
    components.year = dateParts.year
    components.month = dateParts.month
    components.day = dateParts.day
    return UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
  }

  private func timeComponents(from value: String) -> DateComponents? {
    let parts = value.split(separator: ":").compactMap { Int($0) }
    guard parts.count == 2 else { return nil }
    return DateComponents(hour: parts[0], minute: parts[1])
  }

  private func parseDate(_ value: String) -> DateComponents? {
    let parts = value.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    return DateComponents(year: parts[0], month: parts[1], day: parts[2])
  }

  private func add(_ request: UNNotificationRequest) async throws {
    try await withCheckedThrowingContinuation { continuation in
      center.add(request) { error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume()
        }
      }
    }
  }
}