# Habits App

A habit tracking app with web and iOS versions.

## Project Structure

```
habit-app/
├── web/           # Web version (runs in any browser)
│   └── index.html
├── ios-app/       # iOS version (native wrapper)
│   ├── www/       # Web assets for iOS
│   ├── ios/       # Xcode project
│   └── ...
└── index.html     # Original file (legacy)
```

## Web Version

Simply open `web/index.html` in any browser, or serve it with a local server:

```bash
cd web
python3 -m http.server 8000
# Open http://localhost:8000
```

## iOS Version - Running on Your iPhone

### Prerequisites
- A Mac with Xcode installed (free from App Store)
- An Apple ID (free)
- An iPhone with a USB cable

### Quick Setup (10-15 minutes first time)

1. **Open Terminal and navigate to ios-app:**
   ```bash
   cd ios-app
   ```

2. **Open the Xcode project:**
   ```bash
   npm run open
   # Or: npx cap open ios
   ```

3. **In Xcode:**
   - Click on "App" in the left sidebar (project navigator)
   - Select the "App" target
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Apple ID team (add one if needed via Xcode > Settings > Accounts)

4. **Connect your iPhone via USB**
   - Unlock your phone
   - Trust the computer when prompted

5. **Select your iPhone as the build target**
   - In Xcode's toolbar, click the device dropdown (shows "Any iOS Device")
   - Select your iPhone from the list

6. **Build and run:**
   - Press Cmd+R or click the Play button
   - First time: Your phone will show "Untrusted Developer"
   - On your iPhone: Settings > General > VPN & Device Management > Trust your developer profile

7. **Done!** The app is now on your phone and works offline.

### Updating the App

After making changes to the web version:

```bash
cd ios-app
cp ../web/index.html www/
npm run sync
npm run open
# Then build in Xcode (Cmd+R)
```

### Tips

- The app stores data in localStorage, which persists between sessions
- You can add it to your home screen for a full-screen experience
- No App Store or developer program ($99/year) needed for personal use
- The app will stay on your phone for 7 days before needing to be reinstalled (free Apple ID limitation)

## Features

- Track daily, twice-daily, weekly, and monthly habits
- Morning/night scheduling
- Subtasks with optional main screen display
- Momentum scoring system
- Multiple sort options
- Snooze and skip functionality
- Mobile-optimized UI
