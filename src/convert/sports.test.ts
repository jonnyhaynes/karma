// src/convert/sports.test.ts
import { mapSportType } from "./sports";

describe("mapSportType", () => {
  it("maps Run to jogging", () => {
    expect(mapSportType("Run")).toBe("jogging");
  });

  it("maps MountainBikeRide to mtb", () => {
    expect(mapSportType("MountainBikeRide")).toBe("mtb");
  });

  it("maps Hike to hike", () => {
    expect(mapSportType("Hike")).toBe("hike");
  });

  it("maps AlpineSki to skialpin", () => {
    expect(mapSportType("AlpineSki")).toBe("skialpin");
  });

  it("maps unknown types to other", () => {
    expect(mapSportType("FutureSport")).toBe("other");
  });

  it("maps Swim to other", () => {
    expect(mapSportType("Swim")).toBe("other");
  });

  it("maps GravelRide to mtb_easy", () => {
    expect(mapSportType("GravelRide")).toBe("mtb_easy");
  });
});
