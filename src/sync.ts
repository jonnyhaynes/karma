import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Strava → Komoot Sync");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
