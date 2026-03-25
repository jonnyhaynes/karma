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
