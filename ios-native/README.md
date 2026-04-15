# Veritus Native for iPhone

This folder contains a private SwiftUI iPhone shell for Veritus.

What it does:

- opens your existing Veritus AI workspace inside a native iPhone app
- syncs alert programs from `/api/notification-programs` after you log in on the Command Center tab
- schedules time-sensitive local alerts on the phone
- presents a cinematic full-screen alert surface when the alert is opened

What it does not do:

- it does not bypass iOS restrictions to force a custom full-screen lock-screen takeover
- it does not publish anything to the App Store or TestFlight

iOS reality:

- A normal sideloaded app cannot behave like a movie-hacker overlay on the lock screen.
- The compliant path is `time-sensitive` local notifications plus a custom full-screen experience once the notification is opened.
- Critical alerts need Apple approval and are not assumed here.

## Private USB Install Path

1. Move or clone this repo onto a Mac with Xcode installed.
2. Update `VeritusBaseURL` in `VeritusNative/Info.plist` to your deployed Veritus URL.
3. Open `ios-native/VeritusNative.xcodeproj` in Xcode.
4. In Signing & Capabilities, set your personal or paid Apple Developer team and a unique bundle identifier.
5. Connect your iPhone 16 Pro Max over USB-C and trust the Mac.
6. Enable Developer Mode on the iPhone if prompted.
7. Build and run the `VeritusNative` target directly to the device.

If you want this app to stay only on your iPhone:

- do not submit it to App Store Connect
- do not upload it to TestFlight
- sign it only for your own device or your own Apple Developer team

## Usage Flow

1. Open the Command Center tab in the native app.
2. Log into Veritus there once.
3. Run automation flows in Veritus AI and use the new follow-up buttons like `Arm immersive morning alert`.
4. Switch to the Alerts tab in the native app.
5. Tap `Sync & Arm Enabled Alerts`.

The native app reads your authenticated web session cookies from the embedded web view, fetches `/api/notification-programs`, and schedules local iPhone notifications from those programs.
