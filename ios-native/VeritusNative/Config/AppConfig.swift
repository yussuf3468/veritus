import Foundation

enum AppConfig {
  static var baseURL: URL? {
    guard
      let rawValue = Bundle.main.object(forInfoDictionaryKey: "VeritusBaseURL") as? String,
      let url = URL(string: rawValue),
      rawValue.contains("your-veritus-domain.com") == false
    else {
      return nil
    }

    return url
  }

  static var commandCenterURL: URL? {
    baseURL?.appendingPathComponent("dashboard/ai")
  }
}