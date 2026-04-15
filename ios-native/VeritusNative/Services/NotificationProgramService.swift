import Foundation
import WebKit

@MainActor
final class NotificationProgramService: ObservableObject {
  struct APIEnvelope<T: Decodable>: Decodable {
    let data: T?
    let error: String?
  }

  @Published var programs: [NotificationProgram] = []
  @Published var isSyncing = false
  @Published var errorMessage: String?
  @Published var lastSyncedAt: Date?

  func syncFromBackend() async {
    guard let baseURL = AppConfig.baseURL else {
      errorMessage = "Set VeritusBaseURL in Info.plist before syncing alert programs."
      return
    }

    let endpoint = baseURL.appendingPathComponent("api/notification-programs")
    isSyncing = true
    errorMessage = nil

    defer {
      isSyncing = false
    }

    do {
      var request = URLRequest(url: endpoint)
      request.httpMethod = "GET"
      request.timeoutInterval = 30

      if let cookieHeader = await cookieHeader(for: endpoint) {
        request.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
      }

      let (data, response) = try await URLSession.shared.data(for: request)

      guard let httpResponse = response as? HTTPURLResponse else {
        errorMessage = "No HTTP response came back from Veritus."
        return
      }

      if httpResponse.statusCode == 401 {
        errorMessage = "Log in on the Command Center tab first, then sync alerts again."
        return
      }

      let envelope = try JSONDecoder().decode(APIEnvelope<[NotificationProgram]>.self, from: data)

      if let error = envelope.error {
        errorMessage = error
        return
      }

      programs = envelope.data ?? []
      lastSyncedAt = Date()
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func cookieHeader(for url: URL) async -> String? {
    await withCheckedContinuation { continuation in
      WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
        let host = url.host ?? ""
        let matching = cookies.filter { cookie in
          let domain = cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: "."))
          guard domain.isEmpty == false else { return false }
          return host == domain || host.hasSuffix(".\(domain)")
        }

        let header = HTTPCookie.requestHeaderFields(with: matching)["Cookie"]
        continuation.resume(returning: header)
      }
    }
  }
}