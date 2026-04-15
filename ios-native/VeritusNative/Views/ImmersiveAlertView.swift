import SwiftUI

struct ImmersiveAlertView: View {
  @EnvironmentObject private var appState: AppState

  let alert: ImmersiveAlert

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [
          Color(red: 0.02, green: 0.04, blue: 0.08),
          Color(red: 0.10, green: 0.03, blue: 0.15),
          Color.black,
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      Circle()
        .fill(Color.cyan.opacity(0.18))
        .frame(width: 260, height: 260)
        .blur(radius: 40)
        .offset(x: -110, y: -220)

      Circle()
        .fill(Color.orange.opacity(0.18))
        .frame(width: 240, height: 240)
        .blur(radius: 50)
        .offset(x: 120, y: 250)

      VStack(spacing: 24) {
        Spacer(minLength: 20)

        VStack(spacing: 10) {
          Text("Immersive Alert")
            .font(.caption.weight(.medium))
            .textCase(.uppercase)
            .foregroundStyle(.orange)
          Text(alert.title)
            .font(.system(size: 34, weight: .bold, design: .rounded))
            .multilineTextAlignment(.center)
            .foregroundStyle(.white)
          Text(alert.detail)
            .font(.body)
            .multilineTextAlignment(.center)
            .foregroundStyle(.white.opacity(0.72))
        }

        VStack(alignment: .leading, spacing: 12) {
          Text("Automation Prompt")
            .font(.caption.weight(.medium))
            .textCase(.uppercase)
            .foregroundStyle(.cyan)
          Text(alert.prompt)
            .font(.headline)
            .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(22)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 28, style: .continuous)
            .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )

        VStack(spacing: 12) {
          Button {
            appState.run(alert: alert)
          } label: {
            Text("Run in Command Center")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.large)

          Button {
            Task {
              try? await ImmersiveAlertScheduler.shared.scheduleSnooze(for: alert, minutes: 10)
              appState.dismissAlert()
            }
          } label: {
            Text("Snooze 10 Minutes")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(.bordered)
          .controlSize(.large)

          Button {
            appState.dismissAlert()
          } label: {
            Text("Dismiss")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(.plain)
          .foregroundStyle(.white.opacity(0.68))
          .padding(.top, 4)
        }

        Text("This is the native cinematic surface. The lock-screen notification itself still follows iOS rules, but opening it lands here instead of a plain banner flow.")
          .font(.footnote)
          .multilineTextAlignment(.center)
          .foregroundStyle(.white.opacity(0.56))

        Spacer()
      }
      .padding(24)
    }
  }
}