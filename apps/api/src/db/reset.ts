import { adminSql } from "./client";
import { runMigrations } from "./migrate";

function assertNonProductionAndLocal() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cannot reset database in production environment (NODE_ENV=production)!");
  }
  const dbUrl = process.env.DATABASE_URL || "";
  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname.toLowerCase();
    const allowed = ["localhost", "127.0.0.1", "postgres", "::1", "0.0.0.0"];
    if (!allowed.includes(host)) {
      throw new Error(`Cannot reset database on non-local host: ${host}`);
    }
  } catch (err: any) {
    if (err.message.includes("non-local")) throw err;
  }
}

export async function resetDatabase() {
  assertNonProductionAndLocal();

  console.log(">> [Meseid Reset] Dropping and recreating public schema...");
  await adminSql.unsafe(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO meseid;
    GRANT USAGE ON SCHEMA public TO meseid_app, meseid_owner_ctx, meseid_admin_ctx, meseid_system_ctx;
  `);

  console.log(">> [Meseid Reset] Rerunning migrations...");
  await runMigrations();

  console.log(">> [Meseid Reset] ✔ Database reset completed.");
}

if (import.meta.main) {
  resetDatabase()
    .then(async () => {
      await adminSql.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(">> [Meseid Reset] ❌ Reset failed:", err);
      await adminSql.end();
      process.exit(1);
    });
}
