// src/api/strava.ts
import axios, { AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";
import { sleep } from "../utils/sleep";

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

    await checkRateLimit(response.headers);

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
  try {
    const response = await axios.get<StravaStreams>(
      `${BASE_URL}/activities/${activityId}/streams`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { keys: "latlng,altitude,time", key_by_type: true },
      }
    );

    await checkRateLimit(response.headers);

    if (!response.data.latlng) return null;
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null; // activity has no stream data
    }
    throw err; // re-throw unexpected errors
  }
}

async function checkRateLimit(headers: AxiosResponseHeaders | RawAxiosResponseHeaders): Promise<void> {
  const limit = headers["x-ratelimit-limit"] as string | undefined;
  const usage = headers["x-ratelimit-usage"] as string | undefined;
  if (!limit || !usage) return;

  const [, limitPerInterval] = limit.split(",").map(Number);
  const [, usedInInterval] = usage.split(",").map(Number);

  if (limitPerInterval - usedInInterval <= 10) {
    console.warn(`⚠️  Strava rate limit close (${usedInInterval}/${limitPerInterval}). Pausing 60s...`);
    await sleep(60_000);
  }
}
