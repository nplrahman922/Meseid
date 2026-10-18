/**
 * Environment configuration with typed defaults.
 * Provides safe fallbacks for development and test environments
 * so automated test suites run seamlessly without external credentials.
 */

export interface EnvConfig {
  DATABASE_URL: string;
  APP_DATABASE_URL: string;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  FRONTEND_URL: string;
  ADMIN_EMAILS: string[];
  NODE_ENV: string;
  PORT: number;
}

import path from "node:path";
import fs from "node:fs";

// Load .env if running from apps/api subfolder
const candidatePaths = [
  path.resolve(import.meta.dir, "../../../../.env"),
  path.resolve(import.meta.dir, "../../.env")
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
    break;
  }
}

const rawDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://meseid:ganti-dengan-password-kuat@127.0.0.1:5432/meseid";
const rawAppDbUrl =
  process.env.APP_DATABASE_URL ||
  "postgresql://meseid_app:meseid_app_secret_pass_123@127.0.0.1:5432/meseid";

const rawAdminEmails =
  process.env.ADMIN_EMAILS ||
  process.env.ADMIN_EMAIL ||
  "admin@meseid.id,nplrahman922@gmail.com";

export const env: EnvConfig = {
  DATABASE_URL: rawDbUrl.replace("@localhost:", "@127.0.0.1:"),
  APP_DATABASE_URL: rawAppDbUrl.replace("@localhost:", "@127.0.0.1:"),
  SESSION_SECRET:
    process.env.SESSION_SECRET ||
    "meseid_super_secret_session_key_32_bytes_minimum_dev_test!",
  ENCRYPTION_KEY:
    process.env.ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID || "mock-google-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET:
    process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
  GOOGLE_REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:8080/api/auth/google/callback",
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173",
  ADMIN_EMAILS: rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
};
