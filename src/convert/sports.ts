// src/convert/sports.ts
const SPORT_MAP: Record<string, string> = {
  // Running
  Run:                           "jogging",
  TrailRun:                      "jogging",
  VirtualRun:                    "jogging",

  // Road & Gravel Cycling
  Ride:                          "racebike",
  GravelRide:                    "mtb_easy",
  VirtualRide:                   "touringbicycle",
  Velomobile:                    "touringbicycle",
  Handcycle:                     "touringbicycle",

  // E-Bikes
  EBikeRide:                     "e_touringbicycle",
  EMountainBikeRide:             "e_mtb",

  // Mountain Biking
  MountainBikeRide:              "mtb",

  // Hiking & Walking
  Hike:                          "hike",
  Walk:                          "hike",

  // Climbing
  RockClimbing:                  "climbing",

  // Winter Sports
  AlpineSki:                     "skialpin",
  BackcountrySki:                "skitour",
  NordicSki:                     "nordic",
  RollerSki:                     "nordic",
  Snowboard:                     "snowboard",
  Snowshoe:                      "snowshoe",

  // Skating
  IceSkate:                      "skaten",
  InlineSkate:                   "skaten",
  Skateboard:                    "skaten",

  // No Komoot equivalent / typically no GPS
  Swim:                          "other",
  Rowing:                        "other",
  VirtualRow:                    "other",
  Kayaking:                      "other",
  Canoeing:                      "other",
  StandUpPaddling:               "other",
  Surfing:                       "other",
  Windsurf:                      "other",
  Kitesurf:                      "other",
  Sail:                          "other",
  Crossfit:                      "other",
  WeightTraining:                "other",
  Yoga:                          "other",
  Pilates:                       "other",
  Workout:                       "other",
  Elliptical:                    "other",
  StairStepper:                  "other",
  HighIntensityIntervalTraining: "other",
  Soccer:                        "other",
  Tennis:                        "other",
  Badminton:                     "other",
  Squash:                        "other",
  Racquetball:                   "other",
  Pickleball:                    "other",
  TableTennis:                   "other",
  Golf:                          "other",
  Wheelchair:                    "other",
};

export function mapSportType(stravaType: string): string {
  return SPORT_MAP[stravaType] ?? "other";
}
