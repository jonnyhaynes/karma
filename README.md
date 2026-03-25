# KARMA

A one-time CLI tool that syncs all your Strava activities to Komoot. Handles deduplication at two layers — a local state file and Komoot's native duplicate detection — so no activity ever appears twice.

## Features

- Syncs all Strava activity types (runs, rides, hikes, swims, and more)
- Converts Strava GPS streams to GPX format for upload to Komoot
- Maps all Strava sport types to their Komoot equivalents
- Skips activities without GPS data (e.g. indoor trainer rides) gracefully
- Respects Strava API rate limits automatically
- Safe to re-run — already-synced activities are skipped instantly

## Requirements

- Node.js 18+
- A [Strava API app](https://www.strava.com/settings/api)
- A [Komoot developer app](https://developer.komoot.com)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Register API apps

**Strava:**
1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create an app and set the callback URL to `http://localhost:3000/callback`
3. Note your **Client ID** and **Client Secret**

**Komoot:**
1. Go to [developer.komoot.com](https://developer.komoot.com)
2. Create an app and set the callback URL to `http://localhost:3001/callback`
3. Note your **Client ID** and **Client Secret**

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your Strava and Komoot client credentials:

```env
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret

KOMOOT_CLIENT_ID=your_komoot_client_id
KOMOOT_CLIENT_SECRET=your_komoot_client_secret
```

Leave the token fields blank — they are filled in automatically on first run.

## Usage

```bash
npm start
```

On first run, two browser windows will open — one for Strava and one for Komoot — to complete the OAuth flow. Tokens are saved to `.env` automatically. On subsequent runs the auth step is skipped.

Once authenticated, the sync runs and prints a summary:

```
─────────────────────────────────────
  Strava → Komoot Sync Complete
─────────────────────────────────────
  ✅ Synced:      142
  ⏭️  Skipped:     38
  🔁 Duplicates:  0
  ⚠️  No GPS:      6
  ❌ Failed:       2
─────────────────────────────────────
  Failed activity IDs: 8473920, 9102847
  Re-run the script to retry failed activities.
─────────────────────────────────────
```

Failed activities are not marked as synced, so re-running the script will retry them automatically.

## State file

Sync progress is stored in `synced.json` at the project root. This file is gitignored. Delete it to force a full re-sync from scratch.

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run build
```

## Project structure

```
src/
  auth/
    strava.ts       # Strava OAuth2 flow with token refresh
    komoot.ts       # Komoot OAuth2 flow
  api/
    strava.ts       # Activity list + GPS streams fetching
    komoot.ts       # Tour upload
  convert/
    gpx.ts          # Strava streams → GPX converter
    sports.ts       # Strava → Komoot sport type map
  state.ts          # Read/write synced.json
  sync.ts           # Main orchestration
```
