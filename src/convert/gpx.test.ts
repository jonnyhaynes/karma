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
