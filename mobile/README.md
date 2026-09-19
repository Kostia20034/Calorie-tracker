# Calorie Tracker Mobile App

Expo React Native app with web support.

## Setup

From this folder:

```powershell
npm install
```

## Start locally in a browser

Recommended from the repository root:

```powershell
.\start-local.ps1
```

Or start the frontend manually:

```powershell
npm run web -- --port 8081
```

Open <http://localhost:8081>.

The local web app uses the backend at `http://localhost:8001`.

## Start on a phone

Make sure the phone and computer are on the same network.

Start the backend so other devices can reach it:

```powershell
cd ..\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then start Expo in LAN mode from this folder:

```powershell
npx expo start --lan
```

Scan the QR code with Expo Go. Update the native API address in `api.ts` if your computer's LAN IP is different from `10.0.0.4`.

## Available app areas

- Account registration and sign-in
- Persistent sessions and sign-out
- Daily calorie and macro dashboard
- Previous-day meal history
- Breakfast, lunch, and dinner selection
- Manual and AI food entry
- Saved food search, editing, and deletion
- Seven-day nutrition Insights
- Profile and personal nutrition goals

## Type-check

```powershell
npm exec tsc -- --noEmit
```

## Stop

Press `Ctrl+C` in the Expo terminal, or from the repository root run:

```powershell
.\stop-local.ps1
```
