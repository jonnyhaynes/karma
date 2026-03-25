// src/api/komoot.ts
import axios from "axios";
import { sleep } from "../utils/sleep";

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
