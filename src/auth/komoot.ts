// src/auth/komoot.ts
import http from "http";
import { URL } from "url";
import axios from "axios";
import open from "open";
import fs from "fs";
import path from "path";

const REDIRECT_URI = "http://localhost:3001/callback";
const TOKEN_URL = "https://api.komoot.de/oauth/token";
const AUTH_URL = "https://account.komoot.com/oauth/authorize";
const ENV_PATH = path.resolve(process.cwd(), ".env");

export async function getKomootToken(): Promise<{ accessToken: string; userId: string }> {
  const accessToken = process.env.KOMOOT_ACCESS_TOKEN;
  const userId = process.env.KOMOOT_USER_ID;

  if (accessToken && userId) {
    return { accessToken, userId };
  }

  return komootOAuthFlow();
}

async function komootOAuthFlow(): Promise<{ accessToken: string; userId: string }> {
  const CLIENT_ID = process.env.KOMOOT_CLIENT_ID;
  const CLIENT_SECRET = process.env.KOMOOT_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("KOMOOT_CLIENT_ID and KOMOOT_CLIENT_SECRET must be set in .env");
  }
  console.log("🌐 Opening Komoot auth in your browser...");
  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=tour-upload`;
  await open(authUrl);

  const code = await waitForCallback(3001);

  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
    {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const { access_token, user_id } = res.data;
  updateEnv({ KOMOOT_ACCESS_TOKEN: access_token, KOMOOT_USER_ID: String(user_id) });
  console.log("✅ Komoot authenticated");
  return { accessToken: access_token, userId: String(user_id) };
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
