# Running Habits as an iOS app (Capacitor)

The web app is unchanged and still works as a PWA. These steps wrap
the same code in a native iOS shell so reminders fire in the
background and the app-icon badge works. Requires macOS + Xcode and
your Apple Developer account (no App Store / public listing needed
for personal use).

## One-time setup (on the Mac)

```bash
cd habit-app
npm install
npm run build:www                 # assembles www/ from the static files
npx cap add ios                   # creates the ios/ Xcode project
npm run cap:sync                  # build:www + cap sync ios
npx cap open ios                  # opens the project in Xcode
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → set your
   Team (your Apple Developer account). Bundle id is
   `com.oseisenberg.habits` (change in `capacitor.config.json` if you
   prefer; re-run `npm run cap:sync` after any config change).
2. **Signing & Capabilities → + Capability → Push? No.** You only
   need **Background Modes** is *not* required for local
   notifications. Local notifications work out of the box.
3. Plug in your iPhone, select it as the run destination, press
   **Run**. First launch will prompt for notification permission —
   allow it.

With the paid developer account the build is valid ~1 year before it
needs re-signing (just re-run from Xcode).

## After making web changes later

```bash
npm run cap:sync     # re-copies www/ into the iOS project
# then Run again from Xcode (or `npx cap run ios`)
```

## What is native vs web

`platform.js` is the only seam. `AppPlatform.isNative()` is false in
the browser/PWA (everything behaves exactly as before) and true
inside the Capacitor app, where:

- **Notifications:** morning + night daily reminders and the weekly
  summary are scheduled via `@capacitor/local-notifications` so they
  fire while the app is closed. (The momentum alert depends on live
  habit state, so it still only triggers when the app is opened.)
- **Badge:** the app-icon badge uses `@capawesome/capacitor-badge`.
- **Storage:** stays on `localStorage` — persistent inside a packaged
  WKWebView app (the Safari/PWA 7-day eviction does not apply here).
  Keep using Export for backups regardless.

## Notes / limitations

- Notification copy is generic ("Time for your morning habits")
  because iOS schedules them ahead of time and can't run app JS at
  fire time. The in-app lists are still exact.
- `tests/run.js` is unaffected (it runs the web path) — run
  `npm test` to verify logic after changes.
