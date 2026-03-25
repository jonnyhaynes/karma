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
    expect(streams?.latlng?.data).toHaveLength(2);
    expect(streams?.time?.data[1]).toBe(60);
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
