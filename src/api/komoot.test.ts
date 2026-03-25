// src/api/komoot.test.ts
import axios from "axios";
import { uploadTour, UploadResult } from "./komoot";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Speed up tests by mocking the sleep delay
jest.mock("../utils/sleep", () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));

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
