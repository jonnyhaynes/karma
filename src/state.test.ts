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

  it("updates syncedAt timestamp on save", () => {
    const before = new Date().toISOString();
    const state: SyncState = { syncedAt: "", activities: {} };
    saveState(tmpFile, state);
    const loaded = loadState(tmpFile);
    expect(loaded.syncedAt >= before).toBe(true);
  });
});
