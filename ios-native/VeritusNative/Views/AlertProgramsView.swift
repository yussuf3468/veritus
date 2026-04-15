import SwiftUI
import UserNotifications

struct AlertProgramsView: View {
  @EnvironmentObject private var appState: AppState
  @EnvironmentObject private var programService: NotificationProgramService

  @State private var statusMessage: String?
  @State private var authorizationSummary = "Not requested"

  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        VStack(alignment: .leading, spacing: 10) {
          Text("Immersive Alerts")
            .font(.caption.weight(.medium))
            .textCase(.uppercase)
            .foregroundStyle(.orange)
          Text("Time-sensitive alerts, then a full-screen command surface.")
            .font(.title2.weight(.semibold))
            .foregroundStyle(.white)
          Text("iOS will not let a normal personal app draw a fake movie takeover on top of the lock screen. This tab uses the strongest compliant path available: schedule a time-sensitive alert, then open a cinematic full-screen Veritus scene when the alert is opened.")
            .font(.footnote)
            .foregroundStyle(.white.opacity(0.68))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
          LinearGradient(
            colors: [Color.orange.opacity(0.14), Color.black.opacity(0.45)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          ),
          in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )

        VStack(alignment: .leading, spacing: 12) {
          HStack {
            Text("Notification access")
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(.white)
            Spacer()
            Text(authorizationSummary)
              .font(.caption)
              .foregroundStyle(.white.opacity(0.68))
          }

          HStack(spacing: 10) {
            Button("Allow Alerts") {
              Task {
                let granted = await ImmersiveAlertScheduler.shared.requestAuthorization()
                statusMessage = granted
                  ? "Notification access granted."
                  : "Notification access was not granted."
                await refreshAuthorizationSummary()
              }
            }
            .buttonStyle(.borderedProminent)

            Button(programService.isSyncing ? "Syncing..." : "Sync from Veritus") {
              Task {
                await programService.syncFromBackend()
                statusMessage = programService.errorMessage
                  ?? "Synced \(programService.programs.count) alert program(s)."
              }
            }
            .buttonStyle(.bordered)
            .disabled(programService.isSyncing)
          }

          Button("Sync & Arm Enabled Alerts") {
            Task {
              await programService.syncFromBackend()
              if let error = programService.errorMessage {
                statusMessage = error
                return
              }

              let granted = await ImmersiveAlertScheduler.shared.requestAuthorization()
              guard granted else {
                statusMessage = "Notification access is required before arming alerts."
                await refreshAuthorizationSummary()
                return
              }

              do {
                try await ImmersiveAlertScheduler.shared.schedule(programs: programService.programs)
                statusMessage = "Armed \(programService.programs.filter(\.isEnabled).count) enabled alert program(s) on this iPhone."
              } catch {
                statusMessage = error.localizedDescription
              }

              await refreshAuthorizationSummary()
            }
          }
          .buttonStyle(.borderedProminent)

          if let statusMessage {
            Text(statusMessage)
              .font(.footnote)
              .foregroundStyle(.white.opacity(0.74))
          }

          if let lastSyncedAt = programService.lastSyncedAt {
            Text("Last synced: \(lastSyncedAt.formatted(date: .abbreviated, time: .shortened))")
              .font(.caption)
              .foregroundStyle(.white.opacity(0.54))
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 24, style: .continuous)
            .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )

        if programService.programs.isEmpty {
          VStack(alignment: .leading, spacing: 10) {
            Text("No synced alert programs yet.")
              .font(.headline)
              .foregroundStyle(.white)
            Text("Create one from Veritus AI first. The web app now offers follow-up buttons like `Arm immersive morning alert` after automation runs.")
              .font(.footnote)
              .foregroundStyle(.white.opacity(0.68))
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(20)
          .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        } else {
          ForEach(programService.programs) { program in
            VStack(alignment: .leading, spacing: 12) {
              HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                  Text(program.name)
                    .font(.headline)
                    .foregroundStyle(.white)
                  Text(program.description ?? program.prompt)
                    .font(.footnote)
                    .foregroundStyle(.white.opacity(0.68))
                }
                Spacer()
                Text(program.isEnabled ? "Enabled" : "Paused")
                  .font(.caption.weight(.semibold))
                  .padding(.horizontal, 10)
                  .padding(.vertical, 6)
                  .background(program.isEnabled ? Color.cyan.opacity(0.14) : Color.white.opacity(0.08), in: Capsule())
                  .foregroundStyle(program.isEnabled ? Color.cyan : Color.white.opacity(0.74))
              }

              HStack {
                Label(program.scheduleSummary, systemImage: "clock")
                Spacer()
                Text(program.deliveryLabel)
              }
              .font(.caption)
              .foregroundStyle(.white.opacity(0.62))

              HStack(spacing: 10) {
                Button("Preview") {
                  appState.preview(program)
                }
                .buttonStyle(.borderedProminent)

                Button("Run in Command Center") {
                  appState.run(alert: ImmersiveAlert(program: program))
                }
                .buttonStyle(.bordered)
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
              RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
          }
        }
      }
      .padding(18)
    }
    .background(Color.black.ignoresSafeArea())
    .task {
      await refreshAuthorizationSummary()
    }
  }

  @MainActor
  private func refreshAuthorizationSummary() async {
    let settings = await UNUserNotificationCenter.current().notificationSettings()

    authorizationSummary = switch settings.authorizationStatus {
    case .authorized:
      "Authorized"
    case .provisional:
      "Provisional"
    case .ephemeral:
      "Ephemeral"
    case .denied:
      "Denied"
    case .notDetermined:
      "Not requested"
    @unknown default:
      "Unknown"
    }
  }
}