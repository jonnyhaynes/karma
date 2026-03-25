// src/state.ts
import fs from "fs";
import os from "os";
import path from "path";

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
  try {
    return JSON.parse(raw) as SyncState;
  } catch {
    throw new Error(`State file at ${filePath} is corrupt or invalid JSON. Delete it and re-run.`);
  }
}

export function saveState(filePath: string, state: SyncState): void {
  state.syncedAt = new Date().toISOString();
  const tmp = path.join(os.tmpdir(), `synced-${Date.now()}.json.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}
