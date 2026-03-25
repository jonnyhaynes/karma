// src/sync.ts
import dotenv from "dotenv";
dotenv.config();

import path from "path";

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
