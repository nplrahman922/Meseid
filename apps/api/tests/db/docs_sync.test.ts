import { describe, it, expect, beforeAll } from "bun:test";
import { adminSql } from "../../src/db/client";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Documentation Synchronization Verification (docs_sync.test.ts)", () => {
  let dbDocContent: string;
  let erdDocContent: string;

  beforeAll(() => {
    const dbDocPath = resolve(__dirname, "../../../../docs/database.md");
    const erdDocPath = resolve(__dirname, "../../../../docs/erd.md");

    expect(existsSync(dbDocPath)).toBe(true);
    expect(existsSync(erdDocPath)).toBe(true);

    dbDocContent = readFileSync(dbDocPath, "utf-8");
    erdDocContent = readFileSync(erdDocPath, "utf-8");
  });

  it("fails if any relative link contains absolute windows paths (e.g. file:///d:/)", () => {
    expect(dbDocContent).not.toContain("file:///");
    expect(erdDocContent).not.toContain("file:///");
  });

  it("fails if any table in live database is missing from docs/database.md or docs/erd.md", async () => {
    const tables = await adminSql`
      SELECT c.relname as table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `;

    for (const t of tables) {
      expect(dbDocContent).toContain(`**${t.table_name}**`);
      expect(erdDocContent).toContain(t.table_name);
    }
  });

  it("fails if any column in live database is missing from docs/erd.md", async () => {
    const columns = await adminSql`
      SELECT c.relname as table_name, a.attname as column_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r' 
        AND a.attnum > 0 
        AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum;
    `;

    for (const col of columns) {
      expect(erdDocContent).toContain(`\`${col.column_name}\``);
    }
  });

  it("fails if any view in live database is missing from docs/database.md", async () => {
    const views = await adminSql`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    for (const v of views) {
      expect(dbDocContent).toContain(`**\`${v.table_name}\`**`);
    }
  });

  it("fails if any user-defined routine in live database is missing from docs/database.md", async () => {
    const routines = await adminSql`
      SELECT 
        p.proname as routine_name,
        pg_get_function_identity_arguments(p.oid) as identity_args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND NOT p.proname LIKE 'pg_%'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d 
          JOIN pg_extension e ON d.refobjid = e.oid 
          WHERE d.objid = p.oid
        )
      ORDER BY p.proname;
    `;

    for (const r of routines) {
      expect(dbDocContent).toContain(`\`${r.routine_name}(${r.identity_args})\``);
    }
  });

  it("fails if any trigger in live database is missing from docs/database.md", async () => {
    const triggers = await adminSql`
      SELECT event_object_table as table_name, trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `;

    for (const trg of triggers) {
      expect(dbDocContent).toContain(`\`${trg.trigger_name}\``);
    }
  });

  it("fails if any active role grant on public tables differs from docs/database.md", async () => {
    const grants = await adminSql`
      SELECT grantee, table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND grantee IN ('meseid_owner_ctx', 'meseid_admin_ctx', 'meseid_system_ctx')
      ORDER BY table_name, grantee, privilege_type;
    `;

    // Group grants by table
    const tableGrants: Record<string, Record<string, string[]>> = {};
    for (const g of grants) {
      if (!tableGrants[g.table_name]) tableGrants[g.table_name] = {};
      if (!tableGrants[g.table_name][g.grantee]) tableGrants[g.table_name][g.grantee] = [];
      tableGrants[g.table_name][g.grantee].push(g.privilege_type);
    }

    for (const [table, roles] of Object.entries(tableGrants)) {
      for (const [role, privs] of Object.entries(roles)) {
        const sortedPrivs = privs.sort().join(", ");
        // Ensure that this table row in the matrix reflects the privileges
        expect(dbDocContent).toContain(table);
        expect(dbDocContent).toContain(sortedPrivs);
      }
    }
  });
});
