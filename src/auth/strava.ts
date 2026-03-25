// src/auth/strava.ts
import http from "http";
import { URL } from "url";
import axios from "axios";
import open from "open";
import fs from "fs";
import path from "path";

const REDIRECT_URI = "http://localhost:3000/callback";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const AUTH_URL = "https://www.strava.com/oauth/authorize";
const ENV_PATH = path.resolve(process.cwd(), ".env");

export async function getStravaToken(): Promise<string> {
  // Return existing token if still valid
  const accessToken = process.env.STRAVA_ACCESS_TOKEN;
  const expiresAt = Number(process.env.STRAVA_TOKEN_EXPIRES_AT ?? 0);

  if (accessToken && Date.now() / 1000 < expiresAt) {
    return accessToken;
  }

  // Refresh if we have a refresh token
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;
  if (refreshToken) {
    return refreshStravaToken(refreshToken);
  }

  // Full OAuth flow
  return stravaOAuthFlow();
}

async function refreshStravaToken(refreshToken: string): Promise<string> {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env");
  }
  console.log("🔄 Refreshing Strava token...");
  const res = await axios.post(TOKEN_URL, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const { access_token, refresh_token, expires_at } = res.data;
  updateEnv({
    STRAVA_ACCESS_TOKEN: access_token,
    STRAVA_REFRESH_TOKEN: refresh_token,
    STRAVA_TOKEN_EXPIRES_AT: String(expires_at),
  });
  return access_token;
}

async function stravaOAuthFlow(): Promise<string> {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env");
  }
  console.log("🌐 Opening Strava auth in your browser...");
  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=activity:read_all`;
  await open(authUrl);

  const code = await waitForCallback(3000);

  const res = await axios.post(TOKEN_URL, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
  });

  const { access_token, refresh_token, expires_at } = res.data;
  updateEnv({
    STRAVA_ACCESS_TOKEN: access_token,
    STRAVA_REFRESH_TOKEN: refresh_token,
    STRAVA_TOKEN_EXPIRES_AT: String(expires_at),
  });
  console.log("✅ Strava authenticated");
  return access_token;
}

function waitForCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      res.end("Auth complete. You can close this tab.", () => server.close());
      if (code) resolve(code);
      else reject(new Error("No code in callback"));
    });
    server.on("error", reject);
    server.listen(port);
  });
}

function updateEnv(vars: Record<string, string>): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
    process.env[key] = value;
  }
  fs.writeFileSync(ENV_PATH, content.trim() + "\n");
}
