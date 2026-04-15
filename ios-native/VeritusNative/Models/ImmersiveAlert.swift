import Foundation

struct ImmersiveAlert: Identifiable {
  let id: String
  let title: String
  let detail: String
  let prompt: String

  init(program: NotificationProgram) {
    id = program.id
    title = program.name
    detail = program.description ?? program.scheduleSummary
    prompt = program.prompt
  }

  init(id: String, title: String, detail: String, prompt: String) {
    self.id = id
    self.title = title
    self.detail = detail
    self.prompt = prompt
  }

  init?(payload: [AnyHashable: Any]) {
    guard
      let title = payload["title"] as? String,
      let prompt = payload["prompt"] as? String
    else {
      return nil
    }

    id = (payload["program_id"] as? String) ?? UUID().uuidString
    self.title = title
    detail = (payload["detail"] as? String) ?? "Immersive Veritus alert"
    self.prompt = prompt
  }
}