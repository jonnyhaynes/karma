# Strava → Komoot One-Time Sync — Design

**Date:** 2026-03-25
**Stack:** Node.js / TypeScript
**Scope:** One-time historical sync of all Strava activities to Komoot, with no duplication

---

## Overview

A single TypeScript CLI script (`sync.ts`) that runs once and exits. No server, no scheduler, no database — run it from the terminal, it syncs everything, and stops.

---

## Architecture

### High-level flow

```
1. Strava OAuth  → get access token
2. Komoot OAuth  → get access token
3. Load synced.json (IDs of already-uploaded activities)
4. Fetch all Strava activities (paginated)
5. For each activity not in synced.json:
   a. Fetch GPS streams from Strava
   b. Convert streams → GPX string in memory
   c. Map Strava sport type → Komoot sport type
   d. POST GPX to Komoot
   e. On 201 or 202 → mark as synced in state file
6. Save updated synced.json
7. Print summary
```

### Project structure

```
src/
  auth/
    strava.ts       # Strava OAuth2 flow
    komoot.ts       # Komoot OAuth2 flow
  api/
    strava.ts       # Activity list + streams fetching
    komoot.ts       # Tour upload
  convert/
    gpx.ts          # Streams → GPX converter
    sports.ts       # Strava → Komoot sport type map
  state.ts          # Read/write synced.json
  sync.ts           # Main orchestration
synced.json         # Persisted sync state (gitignored)
.env                # API credentials (gitignored)
```

---

## Authentication

Both Strava and Komoot use OAuth 2.0 Authorization Code flow. The script handles both sequentially on first run, saving tokens to `.env` for reuse. On subsequent runs, if tokens exist in `.env`, the browser flow is skipped.

The script spins up a temporary local HTTP server to catch OAuth callbacks, then shuts it down automatically.

### Strava

1. Register app at [strava.com/settings/api](https://www.strava.com/settings/api) — set callback URL to `http://localhost:3000/callback`
2. Script opens browser to Strava auth URL with scope `activity:read_all`
3. Local server on port `3000` catches the `?code=` callback
4. Exchanges code for `access_token` + `refresh_token`
5. Saves both to `.env`
6. Tokens expire after 6 hours — the script auto-refreshes using `refresh_token` if `expires_at` has passed

### Komoot

1. Register app at [developer.komoot.com](https://developer.komoot.com) — set callback URL to `http://localhost:3001/callback`
2. Script opens browser to Komoot auth URL with scope `tour-upload`
3. Local server on port `3001` catches the callback
4. Exchanges code for `access_token` + `user_id`
5. Saves both to `.env`
6. Komoot tokens are long-lived — no refresh logic needed

### `.env` structure

```
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_ACCESS_TOKEN=
STRAVA_REFRESH_TOKEN=
STRAVA_TOKEN_EXPIRES_AT=

KOMOOT_CLIENT_ID=
KOMOOT_CLIENT_SECRET=
KOMOOT_ACCESS_TOKEN=
KOMOOT_USER_ID=
```

---

## Data Fetching & GPX Conversion

### Fetching activities (paginated)

Strava's `GET /athlete/activities` returns max 200 per page. The script loops until an empty page is returned:

```
GET /athlete/activities?per_page=200&page=1
GET /athlete/activities?per_page=200&page=2
... until empty response
```

Each activity returns: `id`, `name`, `sport_type`, `start_date`, `distance`, `moving_time`. Activities already in `synced.json` are skipped immediately — no streams fetch needed.

### Fetching GPS streams

For each unsynced activity:

```
GET /activities/{id}/streams?keys=latlng,altitude,time&key_by_type=true
```

Returns three parallel arrays: coordinates, elevation in metres, and seconds-since-start. Activities with no `latlng` stream (e.g. indoor trainer rides) are skipped gracefully with a log message and recorded as `no_gps` in state.

### GPX conversion

The three streams are zipped together into a GPX `<trkpt>` per data point. The GPX is built as a string in memory — never written to disk.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="strava-to-komoot">
  <trk>
    <name>Morning Run</name>
    <trkseg>
      <trkpt lat="51.5074" lon="-0.1278">
        <ele>23.4</ele>
        <time>2024-06-01T08:00:00Z</time>
      </trkpt>
      ...
    </trkseg>
  </trk>
</gpx>
```

Timestamps are derived from `start_date` + each `time` offset in seconds.

---

## Komoot Upload & Deduplication

### Upload request

```
POST /tours/?data_type=gpx&sport={komootSport}&name={activityName}&time_in_motion={movingTime}
Authorization: Bearer {token}
Content-Type: application/octet-stream
User-Agent: strava-to-komoot/1.0
Body: <gpx string as buffer>
```

### Deduplication — two layers

**Layer 1 — local state (`synced.json`):** Stores every successfully processed Strava activity ID. On re-run, these are skipped before any API call is made. Fast and free.

**Layer 2 — Komoot 202:** If an activity slips through (e.g. `synced.json` was deleted), Komoot returns `202 Accepted` for duplicates. The script treats both `201` and `202` as success and records the ID in state. No activity will ever appear twice on Komoot.

### Rate limiting

A 1-second delay between uploads avoids hammering Komoot's API. For Strava (100 requests per 15 minutes), the script reads `X-RateLimit-Limit` and `X-RateLimit-Usage` response headers and pauses automatically when within 10 requests of the limit.

---

## Sport Type Mapping

All 50 Strava sport types mapped to Komoot equivalents:

```typescript
const SPORT_MAP: Record<string, string> = {
  // Running
  Run:                           "jogging",
  TrailRun:                      "jogging",
  VirtualRun:                    "jogging",

  // Road & Gravel Cycling
  Ride:                          "racebike",
  GravelRide:                    "mtb_easy",
  VirtualRide:                   "touringbicycle",
  Velomobile:                    "touringbicycle",
  Handcycle:                     "touringbicycle",

  // E-Bikes
  EBikeRide:                     "e_touringbicycle",
  EMountainBikeRide:             "e_mtb",

  // Mountain Biking
  MountainBikeRide:              "mtb",

  // Hiking & Walking
  Hike:                          "hike",
  Walk:                          "hike",

  // Climbing
  RockClimbing:                  "climbing",

  // Winter Sports
  AlpineSki:                     "skialpin",
  BackcountrySki:                "skitour",
  NordicSki:                     "nordic",
  RollerSki:                     "nordic",
  Snowboard:                     "snowboard",
  Snowshoe:                      "snowshoe",

  // Skating
  IceSkate:                      "skaten",
  InlineSkate:                   "skaten",
  Skateboard:                    "skaten",

  // No Komoot equivalent / typically no GPS
  Swim:                          "other",
  Rowing:                        "other",
  VirtualRow:                    "other",
  Kayaking:                      "other",
  Canoeing:                      "other",
  StandUpPaddling:               "other",
  Surfing:                       "other",
  Windsurf:                      "other",
  Kitesurf:                      "other",
  Sail:                          "other",
  Crossfit:                      "other",
  WeightTraining:                "other",
  Yoga:                          "other",
  Pilates:                       "other",
  Workout:                       "other",
  Elliptical:                    "other",
  StairStepper:                  "other",
  HighIntensityIntervalTraining: "other",
  Soccer:                        "other",
  Tennis:                        "other",
  Badminton:                     "other",
  Squash:                        "other",
  Racquetball:                   "other",
  Pickleball:                    "other",
  TableTennis:                   "other",
  Golf:                          "other",
  Wheelchair:                    "other",
};
```

> **Note:** `Ride` maps to `racebike` (road cycling). Change to `touringbicycle` if you primarily do casual/touring rides.

---

## Error Handling & Output

### Activity outcomes

Each activity results in one of five states:

| Status      | Meaning                                          | Retried on next run? |
|-------------|--------------------------------------------------|----------------------|
| `synced`    | Uploaded successfully (201)                      | No                   |
| `skipped`   | Already in synced.json                           | No                   |
| `duplicate` | Komoot returned 202 (already exists on Komoot)   | No                   |
| `no_gps`    | No latlng stream (indoor/virtual activity)       | No                   |
| `failed`    | API error or network issue                       | Yes                  |

Failed activities are not written to `synced.json` so they are retried automatically on the next run.

### Terminal summary

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

### `synced.json` structure

```json
{
  "syncedAt": "2026-03-25T10:00:00Z",
  "activities": {
    "8473921": { "status": "synced", "komootId": "abc123", "syncedAt": "2026-03-25T10:00:00Z" },
    "8473922": { "status": "no_gps" }
  }
}
```

---

## Komoot Sport Type Reference

| Komoot identifier  | Label                  |
|--------------------|------------------------|
| `hike`             | Hiking                 |
| `mountaineering`   | Mountaineering         |
| `racebike`         | Road cycling           |
| `e_racebike`       | E-road cycling         |
| `touringbicycle`   | Bike touring           |
| `e_touringbicycle` | E-bike touring         |
| `mtb`              | Mountain biking        |
| `e_mtb`            | E-mountain biking      |
| `mtb_easy`         | Gravel riding          |
| `e_mtb_easy`       | E-gravel riding        |
| `mtb_advanced`     | Enduro mountain biking |
| `e_mtb_advanced`   | E-enduro mountain biking|
| `jogging`          | Running                |
| `climbing`         | Climbing               |
| `downhillbike`     | Downhill               |
| `nordic`           | Cross-country skiing   |
| `nordicwalking`    | Nordic walking         |
| `skaten`           | Skating                |
| `skialpin`         | Alpine skiing          |
| `skitour`          | Alpine ski touring     |
| `sled`             | Sledding               |
| `snowboard`        | Snowboarding           |
| `snowshoe`         | Snow shoe              |
| `unicycle`         | Unicycling             |
| `citybike`         | Bike                   |
| `other`            | Other                  |
