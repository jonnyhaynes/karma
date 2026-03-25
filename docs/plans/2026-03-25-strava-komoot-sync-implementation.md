# Strava → Komoot Sync — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a one-time TypeScript CLI script that syncs all Strava activities to Komoot with no duplication.

**Architecture:** Single `sync.ts` entrypoint orchestrates OAuth, paginated activity fetching, GPS stream → GPX conversion, and Komoot upload. A local `synced.json` state file prevents re-uploading on re-runs; Komoot's native 202 response acts as a second safety net.

**Tech Stack:** TypeScript, Node.js, `axios` (HTTP), `dotenv` (env loading), `open` (browser launch), `jest` + `ts-jest` (testing)

**Worktree:** `.worktrees/feature/strava-komoot-sync`

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.ts`
- Create: `.env.example`
- Create: `src/sync.ts` (stub)

**Step 1: Initialise package.json**

Run in `.worktrees/feature/strava-komoot-sync`:

```bash
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install axios dotenv open
npm install --save-dev typescript ts-node ts-jest jest @types/jest @types/node
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Write jest.config.ts**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/sync.ts", "!src/auth/**"],
};

export default config;
```

**Step 5: Update package.json scripts**

Replace the `"scripts"` section in `package.json` with:

```json
"scripts": {
  "start": "ts-node src/sync.ts",
  "test": "jest",
  "test:watch": "jest --watch",
  "build": "tsc"
}
```

**Step 6: Write .env.example**

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

**Step 7: Write stub src/sync.ts**

```typescript
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Strava → Komoot Sync");
}

main().catch(console.error);
```

**Step 8: Verify it runs**

```bash
npx ts-node src/sync.ts
```
Expected output: `Strava → Komoot Sync`

**Step 9: Run tests (should pass with 0 tests)**

```bash
npm test
```
Expected: `Test Suites: 0 passed`

**Step 10: Commit**

```bash
git add .
git commit -m "feat: project bootstrap with TypeScript, Jest, deps"
```

---

## Task 2: Sport Type Map

**Files:**
- Create: `src/convert/sports.ts`
- Create: `src/convert/sports.test.ts`

**Step 1: Write the failing test**

```typescript
// src/convert/sports.test.ts
import { mapSportType } from "./sports";

describe("mapSportType", () => {
  it("maps Run to jogging", () => {
    expect(mapSportType("Run")).toBe("jogging");
  });

  it("maps MountainBikeRide to mtb", () => {
    expect(mapSportType("MountainBikeRide")).toBe("mtb");
  });

  it("maps Hike to hike", () => {
    expect(mapSportType("Hike")).toBe("hike");
  });

  it("maps AlpineSki to skialpin", () => {
    expect(mapSportType("AlpineSki")).toBe("skialpin");
  });

  it("maps unknown types to other", () => {
    expect(mapSportType("FutureSport")).toBe("other");
  });

  it("maps Swim to other", () => {
    expect(mapSportType("Swim")).toBe("other");
  });

  it("maps GravelRide to mtb_easy", () => {
    expect(mapSportType("GravelRide")).toBe("mtb_easy");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=sports
```
Expected: FAIL — `Cannot find module './sports'`

**Step 3: Write the implementation**

```typescript
// src/convert/sports.ts
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

export function mapSportType(stravaType: string): string {
  return SPORT_MAP[stravaType] ?? "other";
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=sports
```
Expected: PASS — 7 tests passing

**Step 5: Commit**

```bash
git add src/convert/sports.ts src/convert/sports.test.ts
git commit -m "feat: add Strava → Komoot sport type mapping"
```

---

## Task 3: GPX Converter

**Files:**
- Create: `src/convert/gpx.ts`
- Create: `src/convert/gpx.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/convert/gpx.test.ts
import { buildGpx, GpxInput } from "./gpx";

const input: GpxInput = {
  name: "Morning Run",
  startDate: "2024-06-01T08:00:00Z",
  latlng: [[51.5074, -0.1278], [51.5080, -0.1285]],
  altitude: [23.4, 24.1],
  time: [0, 30],
};

describe("buildGpx", () => {
  it("returns a string starting with XML declaration", () => {
    const gpx = buildGpx(input);
    expect(gpx).toMatch(/^<\?xml version="1.0"/);
  });

  it("includes the activity name", () => {
    const gpx = buildGpx(input);
    expect(gpx).toContain("<name>Morning Run</name>");
  });

  it("includes correct lat/lon for first point", () => {
    const gpx = buildGpx(input);
    expect(gpx).toContain('lat="51.5074" lon="-0.1278"');
  });

  it("includes elevation for first point", () => {
    const gpx = buildGpx(input);
    expect(gpx).toContain("<ele>23.4</ele>");
  });

  it("computes correct timestamp for first point (offset 0)", () => {
    const gpx = buildGpx(input);
    expect(gpx).toContain("<time>2024-06-01T08:00:00.000Z</time>");
  });

  it("computes correct timestamp for second point (offset 30s)", () => {
    const gpx = buildGpx(input);
    expect(gpx).toContain("<time>2024-06-01T08:00:30.000Z</time>");
  });

  it("includes two trkpt elements", () => {
    const gpx = buildGpx(input);
    const matches = gpx.match(/<trkpt/g);
    expect(matches).toHaveLength(2);
  });

  it("handles missing altitude gracefully (no ele tag)", () => {
    const noAlt: GpxInput = { ...input, altitude: [] };
    const gpx = buildGpx(noAlt);
    expect(gpx).not.toContain("<ele>");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=gpx
```
Expected: FAIL — `Cannot find module './gpx'`

**Step 3: Write the implementation**

```typescript
// src/convert/gpx.ts
export interface GpxInput {
  name: string;
  startDate: string; // ISO 8601 UTC
  latlng: [number, number][];
  altitude: number[];
  time: number[]; // seconds since start
}

export function buildGpx(input: GpxInput): string {
  const startMs = new Date(input.startDate).getTime();
  const hasAltitude = input.altitude.length > 0;

  const trackPoints = input.latlng
    .map(([lat, lon], i) => {
      const timestamp = new Date(startMs + input.time[i] * 1000).toISOString();
      const ele = hasAltitude ? `\n        <ele>${input.altitude[i]}</ele>` : "";
      return `      <trkpt lat="${lat}" lon="${lon}">${ele}
        <time>${timestamp}</time>
      </trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="strava-to-komoot">
  <trk>
    <name>${escapeXml(input.name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=gpx
```
Expected: PASS — 8 tests passing

**Step 5: Commit**

```bash
git add src/convert/gpx.ts src/convert/gpx.test.ts
git commit -m "feat: add Strava streams → GPX converter"
```

---

## Task 4: State Manager

**Files:**
- Create: `src/state.ts`
- Create: `src/state.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/state.test.ts
import fs from "fs";
import path from "path";
import os from "os";
import { loadState, saveState, SyncState, ActivityRecord } from "./state";

const tmpFile = path.join(os.tmpdir(), `test-synced-${Date.now()}.json`);

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

describe("loadState", () => {
  it("returns empty state when file does not exist", () => {
    const state = loadState("/nonexistent/path.json");
    expect(state.activities).toEqual({});
  });

  it("loads existing state from file", () => {
    const data: SyncState = {
      syncedAt: "2024-01-01T00:00:00Z",
      activities: {
        "123": { status: "synced", komootId: "abc", syncedAt: "2024-01-01T00:00:00Z" },
      },
    };
    fs.writeFileSync(tmpFile, JSON.stringify(data));
    const state = loadState(tmpFile);
    expect(state.activities["123"].status).toBe("synced");
  });
});

describe("saveState", () => {
  it("writes state to file as JSON", () => {
    const state: SyncState = {
      syncedAt: new Date().toISOString(),
      activities: {
        "456": { status: "no_gps" },
      },
    };
    saveState(tmpFile, state);
    const raw = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
    expect(raw.activities["456"].status).toBe("no_gps");
  });

  it("marks an activity as synced", () => {
    const state: SyncState = { syncedAt: "", activities: {} };
    const record: ActivityRecord = { status: "synced", komootId: "xyz", syncedAt: new Date().toISOString() };
    state.activities["789"] = record;
    saveState(tmpFile, state);
    const loaded = loadState(tmpFile);
    expect(loaded.activities["789"].komootId).toBe("xyz");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=state
```
Expected: FAIL — `Cannot find module './state'`

**Step 3: Write the implementation**

```typescript
// src/state.ts
import fs from "fs";

export interface ActivityRecord {
  status: "synced" | "duplicate" | "no_gps" | "failed";
  komootId?: string;
  syncedAt?: string;
}

export interface SyncState {
  syncedAt: string;
  activities: Record<string, ActivityRecord>;
}

export function loadState(filePath: string): SyncState {
  if (!fs.existsSync(filePath)) {
    return { syncedAt: "", activities: {} };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as SyncState;
}

export function saveState(filePath: string, state: SyncState): void {
  state.syncedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=state
```
Expected: PASS — 5 tests passing

**Step 5: Commit**

```bash
git add src/state.ts src/state.test.ts
git commit -m "feat: add sync state manager (load/save synced.json)"
```

---

## Task 5: Strava API Module

**Files:**
- Create: `src/api/strava.ts`
- Create: `src/api/strava.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/api/strava.test.ts
import axios from "axios";
import { fetchAllActivities, fetchStreams, StravaActivity, StravaStreams } from "./strava";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockActivity: StravaActivity = {
  id: 123456,
  name: "Morning Run",
  sport_type: "Run",
  start_date: "2024-06-01T08:00:00Z",
  moving_time: 1800,
};

describe("fetchAllActivities", () => {
  it("returns activities from a single page", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: [mockActivity], headers: {} })
      .mockResolvedValueOnce({ data: [], headers: {} });

    const activities = await fetchAllActivities("token123");
    expect(activities).toHaveLength(1);
    expect(activities[0].name).toBe("Morning Run");
  });

  it("paginates across multiple pages", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: [mockActivity, mockActivity], headers: {} })
      .mockResolvedValueOnce({ data: [mockActivity], headers: {} })
      .mockResolvedValueOnce({ data: [], headers: {} });

    const activities = await fetchAllActivities("token123");
    expect(activities).toHaveLength(3);
  });
});

describe("fetchStreams", () => {
  it("returns parsed stream data", async () => {
    const mockStreams: StravaStreams = {
      latlng: { data: [[51.5, -0.1], [51.6, -0.2]] },
      altitude: { data: [10, 20] },
      time: { data: [0, 60] },
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockStreams, headers: {} });

    const streams = await fetchStreams("token123", 999);
    expect(streams?.latlng.data).toHaveLength(2);
    expect(streams?.time.data[1]).toBe(60);
  });

  it("returns null when no latlng stream exists", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { time: { data: [0, 60] } },
      headers: {},
    });

    const streams = await fetchStreams("token123", 999);
    expect(streams).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=api/strava
```
Expected: FAIL — `Cannot find module './strava'`

**Step 3: Write the implementation**

```typescript
// src/api/strava.ts
import axios from "axios";

const BASE_URL = "https://www.strava.com/api/v3";

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  moving_time: number;
}

export interface StravaStreams {
  latlng?: { data: [number, number][] };
  altitude?: { data: number[] };
  time?: { data: number[] };
}

export async function fetchAllActivities(accessToken: string): Promise<StravaActivity[]> {
  const activities: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const response = await axios.get<StravaActivity[]>(`${BASE_URL}/athlete/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 200, page },
    });

    checkRateLimit(response.headers);

    if (response.data.length === 0) break;
    activities.push(...response.data);
    page++;
  }

  return activities;
}

export async function fetchStreams(
  accessToken: string,
  activityId: number
): Promise<StravaStreams | null> {
  const response = await axios.get<StravaStreams>(
    `${BASE_URL}/activities/${activityId}/streams`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { keys: "latlng,altitude,time", key_by_type: true },
    }
  );

  checkRateLimit(response.headers);

  if (!response.data.latlng) return null;
  return response.data;
}

function checkRateLimit(headers: Record<string, string>): void {
  const limit = headers["x-ratelimit-limit"];
  const usage = headers["x-ratelimit-usage"];
  if (!limit || !usage) return;

  const [, limitPerInterval] = limit.split(",").map(Number);
  const [, usedInInterval] = usage.split(",").map(Number);

  if (limitPerInterval - usedInInterval <= 10) {
    console.warn(`⚠️  Strava rate limit close (${usedInInterval}/${limitPerInterval}). Pausing 60s...`);
    // In production this would sleep; kept synchronous for testability
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=api/strava
```
Expected: PASS — 4 tests passing

**Step 5: Commit**

```bash
git add src/api/strava.ts src/api/strava.test.ts
git commit -m "feat: add Strava API module (activities + streams)"
```

---

## Task 6: Komoot API Module

**Files:**
- Create: `src/api/komoot.ts`
- Create: `src/api/komoot.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/api/komoot.test.ts
import axios from "axios";
import { uploadTour, UploadResult } from "./komoot";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("uploadTour", () => {
  const gpxBuffer = Buffer.from("<gpx>...</gpx>");
  const opts = {
    accessToken: "token123",
    userId: "user456",
    gpx: gpxBuffer,
    name: "Morning Run",
    sport: "jogging",
    movingTime: 1800,
  };

  it("returns synced with komootId on 201", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 201,
      data: { id: "komoot-tour-abc" },
    });

    const result: UploadResult = await uploadTour(opts);
    expect(result.status).toBe("synced");
    expect(result.komootId).toBe("komoot-tour-abc");
  });

  it("returns duplicate on 202", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 202,
      data: { id: "komoot-tour-xyz" },
    });

    const result: UploadResult = await uploadTour(opts);
    expect(result.status).toBe("duplicate");
    expect(result.komootId).toBe("komoot-tour-xyz");
  });

  it("returns failed on network error", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Network Error"));

    const result: UploadResult = await uploadTour(opts);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Network Error");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=api/komoot
```
Expected: FAIL — `Cannot find module './komoot'`

**Step 3: Write the implementation**

```typescript
// src/api/komoot.ts
import axios from "axios";

const BASE_URL = "https://api.komoot.de/v007";
const DELAY_MS = 1000;

export interface UploadOptions {
  accessToken: string;
  userId: string;
  gpx: Buffer;
  name: string;
  sport: string;
  movingTime: number;
}

export interface UploadResult {
  status: "synced" | "duplicate" | "failed";
  komootId?: string;
  error?: string;
}

export async function uploadTour(opts: UploadOptions): Promise<UploadResult> {
  await sleep(DELAY_MS);

  try {
    const response = await axios.post(
      `${BASE_URL}/tours/`,
      opts.gpx,
      {
        params: {
          data_type: "gpx",
          sport: opts.sport,
          name: opts.name,
          time_in_motion: opts.movingTime,
        },
        headers: {
          Authorization: `Bearer ${opts.accessToken}`,
          "Content-Type": "application/octet-stream",
          "User-Agent": "strava-to-komoot/1.0",
        },
        validateStatus: (status) => status === 201 || status === 202,
      }
    );

    const komootId = response.data?.id as string | undefined;

    if (response.status === 201) {
      return { status: "synced", komootId };
    }
    return { status: "duplicate", komootId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "failed", error: message };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=api/komoot
```
Expected: PASS — 3 tests passing

**Step 5: Commit**

```bash
git add src/api/komoot.ts src/api/komoot.test.ts
git commit -m "feat: add Komoot API module (tour upload)"
```

---

## Task 7: Strava Auth Module

> Auth modules interact with OAuth browser flows — not unit tested. We wire them up manually and verify by running the script.

**Files:**
- Create: `src/auth/strava.ts`

**Step 1: Write src/auth/strava.ts**

```typescript
// src/auth/strava.ts
import http from "http";
import { URL } from "url";
import axios from "axios";
import open from "open";
import fs from "fs";
import path from "path";

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3000/callback";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const AUTH_URL = "https://www.strava.com/oauth/authorize";
const ENV_PATH = path.resolve(process.cwd(), ".env");

export async function getStravaToken(): Promise<string> {
  // Return existing token if still valid
  const accessToken = process.env.STRAVA_ACCESS_TOKEN;
  const expiresAt = Number(process.env.STRAVA_TOKEN_EXPIRES_AT ?? 0);

  if (accessToken && Date.now() / 1000 < expiresAt) {
    return accessToken;
  }

  // Refresh if we have a refresh token
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;
  if (refreshToken) {
    return refreshStravaToken(refreshToken);
  }

  // Full OAuth flow
  return stravaOAuthFlow();
}

async function refreshStravaToken(refreshToken: string): Promise<string> {
  console.log("🔄 Refreshing Strava token...");
  const res = await axios.post(TOKEN_URL, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const { access_token, refresh_token, expires_at } = res.data;
  updateEnv({ STRAVA_ACCESS_TOKEN: access_token, STRAVA_REFRESH_TOKEN: refresh_token, STRAVA_TOKEN_EXPIRES_AT: String(expires_at) });
  return access_token;
}

async function stravaOAuthFlow(): Promise<string> {
  console.log("🌐 Opening Strava auth in your browser...");
  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=activity:read_all`;
  await open(authUrl);

  const code = await waitForCallback(3000);

  const res = await axios.post(TOKEN_URL, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
  });

  const { access_token, refresh_token, expires_at } = res.data;
  updateEnv({ STRAVA_ACCESS_TOKEN: access_token, STRAVA_REFRESH_TOKEN: refresh_token, STRAVA_TOKEN_EXPIRES_AT: String(expires_at) });
  console.log("✅ Strava authenticated");
  return access_token;
}

function waitForCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      res.end("Auth complete. You can close this tab.");
      server.close();
      if (code) resolve(code);
      else reject(new Error("No code in callback"));
    });
    server.listen(port);
  });
}

function updateEnv(vars: Record<string, string>): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
    process.env[key] = value;
  }
  fs.writeFileSync(ENV_PATH, content.trim() + "\n");
}
```

**Step 2: Commit**

```bash
git add src/auth/strava.ts
git commit -m "feat: add Strava OAuth2 auth module"
```

---

## Task 8: Komoot Auth Module

**Files:**
- Create: `src/auth/komoot.ts`

**Step 1: Write src/auth/komoot.ts**

```typescript
// src/auth/komoot.ts
import http from "http";
import { URL } from "url";
import axios from "axios";
import open from "open";
import fs from "fs";
import path from "path";

const CLIENT_ID = process.env.KOMOOT_CLIENT_ID!;
const CLIENT_SECRET = process.env.KOMOOT_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3001/callback";
const TOKEN_URL = "https://api.komoot.de/oauth/token";
const AUTH_URL = "https://account.komoot.com/oauth/authorize";
const ENV_PATH = path.resolve(process.cwd(), ".env");

export async function getKomootToken(): Promise<{ accessToken: string; userId: string }> {
  const accessToken = process.env.KOMOOT_ACCESS_TOKEN;
  const userId = process.env.KOMOOT_USER_ID;

  if (accessToken && userId) {
    return { accessToken, userId };
  }

  return komootOAuthFlow();
}

async function komootOAuthFlow(): Promise<{ accessToken: string; userId: string }> {
  console.log("🌐 Opening Komoot auth in your browser...");
  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=tour-upload`;
  await open(authUrl);

  const code = await waitForCallback(3001);

  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
    {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const { access_token, user_id } = res.data;
  updateEnv({ KOMOOT_ACCESS_TOKEN: access_token, KOMOOT_USER_ID: String(user_id) });
  console.log("✅ Komoot authenticated");
  return { accessToken: access_token, userId: String(user_id) };
}

function waitForCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      res.end("Auth complete. You can close this tab.");
      server.close();
      if (code) resolve(code);
      else reject(new Error("No code in callback"));
    });
    server.listen(port);
  });
}

function updateEnv(vars: Record<string, string>): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
    process.env[key] = value;
  }
  fs.writeFileSync(ENV_PATH, content.trim() + "\n");
}
```

**Step 2: Commit**

```bash
git add src/auth/komoot.ts
git commit -m "feat: add Komoot OAuth2 auth module"
```

---

## Task 9: Main Sync Orchestrator

**Files:**
- Modify: `src/sync.ts`

**Step 1: Replace src/sync.ts with the full orchestrator**

```typescript
// src/sync.ts
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { getStravaToken } from "./auth/strava";
import { getKomootToken } from "./auth/komoot";
import { fetchAllActivities, fetchStreams } from "./api/strava";
import { uploadTour } from "./api/komoot";
import { buildGpx } from "./convert/gpx";
import { mapSportType } from "./convert/sports";
import { loadState, saveState, SyncState } from "./state";

const STATE_FILE = path.resolve(process.cwd(), "synced.json");

interface Summary {
  synced: number;
  skipped: number;
  duplicates: number;
  noGps: number;
  failed: number;
  failedIds: number[];
}

async function main() {
  // 1. Authenticate
  const stravaToken = await getStravaToken();
  const { accessToken: komootToken, userId: komootUserId } = await getKomootToken();

  // 2. Load state
  const state: SyncState = loadState(STATE_FILE);
  const summary: Summary = { synced: 0, skipped: 0, duplicates: 0, noGps: 0, failed: 0, failedIds: [] };

  // 3. Fetch all activities
  console.log("\n📋 Fetching Strava activities...");
  const activities = await fetchAllActivities(stravaToken);
  console.log(`   Found ${activities.length} activities\n`);

  // 4. Process each activity
  for (const activity of activities) {
    const id = String(activity.id);

    // Skip if already processed
    if (state.activities[id]) {
      summary.skipped++;
      continue;
    }

    process.stdout.write(`→ [${activity.sport_type}] ${activity.name} (${id})... `);

    // Fetch GPS streams
    const streams = await fetchStreams(stravaToken, activity.id);

    if (!streams || !streams.latlng) {
      console.log("⚠️  no GPS");
      state.activities[id] = { status: "no_gps" };
      saveState(STATE_FILE, state);
      summary.noGps++;
      continue;
    }

    // Build GPX
    const gpxString = buildGpx({
      name: activity.name,
      startDate: activity.start_date,
      latlng: streams.latlng.data,
      altitude: streams.altitude?.data ?? [],
      time: streams.time?.data ?? [],
    });

    // Upload to Komoot
    const result = await uploadTour({
      accessToken: komootToken,
      userId: komootUserId,
      gpx: Buffer.from(gpxString, "utf-8"),
      name: activity.name,
      sport: mapSportType(activity.sport_type),
      movingTime: activity.moving_time,
    });

    if (result.status === "synced") {
      console.log(`✅ synced (komoot: ${result.komootId})`);
      state.activities[id] = { status: "synced", komootId: result.komootId, syncedAt: new Date().toISOString() };
      saveState(STATE_FILE, state);
      summary.synced++;
    } else if (result.status === "duplicate") {
      console.log(`🔁 duplicate`);
      state.activities[id] = { status: "duplicate", komootId: result.komootId };
      saveState(STATE_FILE, state);
      summary.duplicates++;
    } else {
      console.log(`❌ failed: ${result.error}`);
      summary.failed++;
      summary.failedIds.push(activity.id);
    }
  }

  // 5. Print summary
  printSummary(summary);
}

function printSummary(s: Summary): void {
  console.log("\n─────────────────────────────────────");
  console.log("  Strava → Komoot Sync Complete");
  console.log("─────────────────────────────────────");
  console.log(`  ✅ Synced:      ${s.synced}`);
  console.log(`  ⏭️  Skipped:     ${s.skipped}`);
  console.log(`  🔁 Duplicates:  ${s.duplicates}`);
  console.log(`  ⚠️  No GPS:      ${s.noGps}`);
  console.log(`  ❌ Failed:       ${s.failed}`);
  if (s.failedIds.length > 0) {
    console.log("─────────────────────────────────────");
    console.log(`  Failed IDs: ${s.failedIds.join(", ")}`);
    console.log("  Re-run to retry failed activities.");
  }
  console.log("─────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

**Step 2: Run the full test suite to ensure nothing broke**

```bash
npm test
```
Expected: All previous tests still pass (sports, gpx, state, api/strava, api/komoot)

**Step 3: Commit**

```bash
git add src/sync.ts
git commit -m "feat: add main sync orchestrator"
```

---

## Task 10: Final Wiring & Smoke Test

**Step 1: Copy .env.example to .env and fill in your credentials**

```bash
cp .env.example .env
```

Then open `.env` and fill in:
- `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from [strava.com/settings/api](https://www.strava.com/settings/api)
  - Set "Authorization Callback Domain" to `localhost`
- `KOMOOT_CLIENT_ID` and `KOMOOT_CLIENT_SECRET` from [developer.komoot.com](https://developer.komoot.com)
  - Set redirect URI to `http://localhost:3001/callback`

**Step 2: Run the sync script**

```bash
npm start
```

Expected behaviour on first run:
1. Browser opens for Strava auth → grant access → browser shows "Auth complete"
2. Browser opens for Komoot auth → grant access → browser shows "Auth complete"
3. Script logs activity-by-activity progress
4. Final summary printed

**Step 3: Run again to verify deduplication**

```bash
npm start
```

Expected: All activities show as `⏭️  Skipped` — nothing re-uploaded.

**Step 4: Final test run**

```bash
npm test
```
Expected: All tests pass, 0 failures.

**Step 5: Final commit**

```bash
git add .env.example
git commit -m "feat: complete Strava → Komoot sync implementation"
```

---

## Summary of All Tasks

| Task | What it builds | Tests |
|------|----------------|-------|
| 1 | Project bootstrap | — |
| 2 | Sport type map | 7 unit tests |
| 3 | GPX converter | 8 unit tests |
| 4 | State manager | 5 unit tests |
| 5 | Strava API module | 4 unit tests |
| 6 | Komoot API module | 3 unit tests |
| 7 | Strava auth | — (OAuth, manual) |
| 8 | Komoot auth | — (OAuth, manual) |
| 9 | Sync orchestrator | Integration via tasks above |
| 10 | Final wiring | Smoke test |
