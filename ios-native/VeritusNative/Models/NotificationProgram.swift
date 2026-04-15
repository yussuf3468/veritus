import Foundation

struct NotificationProgram: Codable, Identifiable, Hashable {
  enum DeliveryMode: String, Codable {
    case standard
    case timeSensitive = "time_sensitive"
    case immersive
  }

  enum ScheduleType: String, Codable {
    case once
    case daily
    case weekly
  }

  let id: String
  let userID: String?
  let name: String
  let description: String?
  let prompt: String
  let deliveryMode: DeliveryMode
  let scheduleType: ScheduleType
  let scheduleTime: String
  let scheduleDate: String?
  let weekdays: [Int]
  let isEnabled: Bool
  let fullScreenIntent: Bool
  let lastTriggeredAt: String?
  let createdAt: String?
  let updatedAt: String?

  enum CodingKeys: String, CodingKey {
    case id
    case name
    case description
    case prompt
    case weekdays
    case userID = "user_id"
    case deliveryMode = "delivery_mode"
    case scheduleType = "schedule_type"
    case scheduleTime = "schedule_time"
    case scheduleDate = "schedule_date"
    case isEnabled = "is_enabled"
    case fullScreenIntent = "full_screen_intent"
    case lastTriggeredAt = "last_triggered_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  var scheduleSummary: String {
    switch scheduleType {
    case .once:
      if let scheduleDate {
        return "Once on \(scheduleDate) at \(scheduleTime)"
      }
      return "One-time alert at \(scheduleTime)"
    case .daily:
      return "Every day at \(scheduleTime)"
    case .weekly:
      let labels = weekdays.isEmpty ? ["Sunday"] : weekdays.map(Self.weekdayLabel)
      return "Weekly on \(labels.joined(separator: ", ")) at \(scheduleTime)"
    }
  }

  var deliveryLabel: String {
    switch deliveryMode {
    case .standard:
      return "Standard"
    case .timeSensitive:
      return "Time-sensitive"
    case .immersive:
      return "Immersive"
    }
  }

  var notificationRequestIdentifiers: [String] {
    switch scheduleType {
    case .weekly where weekdays.isEmpty == false:
      return weekdays.map { "veritus.alert.\(id).\($0)" }
    default:
      return ["veritus.alert.\(id)"]
    }
  }

  static func weekdayLabel(_ value: Int) -> String {
    switch value {
    case 1:
      return "Sunday"
    case 2:
      return "Monday"
    case 3:
      return "Tuesday"
    case 4:
      return "Wednesday"
    case 5:
      return "Thursday"
    case 6:
      return "Friday"
    case 7:
      return "Saturday"
    default:
      return "Day \(value)"
    }
  }
}