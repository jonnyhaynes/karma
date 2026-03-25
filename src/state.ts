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
