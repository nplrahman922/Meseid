import fs from "node:fs";
import path from "node:path";
import { adminSql } from "./client";

export async function runMigrations() {
  console.log(">> [Meseid Migrations] Starting database migrations...");

  try {
    // 1. Ensure migrations tracking table exists
    await adminSql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // 2. Read migration directory
    const migrationsDir = path.join(__dirname, "migrations");
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log(">> [Meseid Migrations] No migration files found.");
      return;
    }

    // 3. Get applied migrations
    const appliedRows = await adminSql<{ name: string }[]>`
      SELECT name FROM schema_migrations;
    `;
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 4. Run unapplied migrations one transaction per file
    let newlyApplied = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      console.log(`>> [Meseid Migrations] Applying: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      await adminSql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file});`;
      });

      console.log(`>> [Meseid Migrations] ✔ Applied: ${file}`);
      newlyApplied++;
    }

    if (newlyApplied === 0) {
      console.log(">> [Meseid Migrations] Database is already up to date.");
    } else {
      console.log(
        `>> [Meseid Migrations] Successfully applied ${newlyApplied} migration(s).`
      );
    }
  } catch (err) {
    console.error(">> [Meseid Migrations] ❌ Migration failed:", err);
    throw err;
  }
}

// Execute directly if run as main
if (import.meta.main) {
  runMigrations()
    .then(async () => {
      await adminSql.end();
      process.exit(0);
    })
    .catch(async () => {
      await adminSql.end();
      process.exit(1);
    });
}
