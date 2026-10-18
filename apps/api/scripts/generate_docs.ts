import { adminSql } from "../src/db/client";
import { writeFileSync } from "fs";
import { resolve } from "path";

async function generate() {
  console.log(">> [Meseid Docs Generator] Introspecting LIVE PostgreSQL database...");

  // 1. Tables & RLS Status
  const tables = await adminSql`
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `;

  // 2. Columns
  const columns = await adminSql`
    SELECT 
      table_name,
      column_name,
      ordinal_position,
      column_default,
      is_nullable,
      data_type,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  // 3. Views
  const views = await adminSql`
    SELECT 
      table_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  // 4. Role Table Grants
  const grants = await adminSql`
    SELECT 
      grantee,
      table_name,
      privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('meseid_owner_ctx', 'meseid_admin_ctx', 'meseid_system_ctx')
    ORDER BY table_name, grantee, privilege_type;
  `;

  // 5. Routines (Functions & Procedures, excluding extensions like btree_gist and citext)
  const routines = await adminSql`
    SELECT 
      p.proname as routine_name,
      pg_get_function_identity_arguments(p.oid) as identity_args,
      pg_get_function_arguments(p.oid) as full_args,
      pg_get_function_result(p.oid) as result_type,
      CASE p.prokind
        WHEN 'f' THEN 'FUNCTION'
        WHEN 'p' THEN 'PROCEDURE'
        WHEN 'a' THEN 'AGGREGATE'
        WHEN 'w' THEN 'WINDOW'
      END as routine_kind,
      CASE p.prosecdef
        WHEN true THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
      END as security_type,
      CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
      END as volatility
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT p.proname LIKE 'pg_%'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d 
        JOIN pg_extension e ON d.refobjid = e.oid 
        WHERE d.objid = p.oid
      )
    ORDER BY routine_kind, routine_name, identity_args;
  `;

  // 6. Triggers
  const triggers = await adminSql`
    SELECT 
      event_object_table as table_name,
      trigger_name,
      event_manipulation,
      action_timing,
      action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `;

  // 7. Foreign Keys
  const foreignKeys = await adminSql`
    SELECT
      tc.table_name as source_table,
      kcu.column_name as source_column,
      ccu.table_name as target_table,
      ccu.column_name as target_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `;

  console.log(`Introspected ${tables.length} tables, ${views.length} views, ${routines.length} routines, ${triggers.length} triggers.`);

  // Build ERD Markdown
  const erdContent = generateErdMarkdown(tables, columns, foreignKeys);
  const erdPath = resolve(__dirname, "../../../docs/erd.md");
  writeFileSync(erdPath, erdContent, "utf-8");
  console.log(`>> [Meseid Docs Generator] ✔ Generated docs/erd.md`);

  // Build Database Specification Markdown
  const databaseContent = generateDatabaseMarkdown(tables, columns, views, grants, routines, triggers);
  const dbPath = resolve(__dirname, "../../../docs/database.md");
  writeFileSync(dbPath, databaseContent, "utf-8");
  console.log(`>> [Meseid Docs Generator] ✔ Generated docs/database.md`);

  await adminSql.end();
}

function generateErdMarkdown(tables: any[], columns: any[], foreignKeys: any[]): string {
  const tableNames = new Set(tables.map((t) => t.table_name));

  let mermaidLines: string[] = [];
  mermaidLines.push("erDiagram");

  // Relationships from foreign keys
  const renderedRel = new Set<string>();
  for (const fk of foreignKeys) {
    if (tableNames.has(fk.source_table) && tableNames.has(fk.target_table)) {
      const relKey = `${fk.target_table}-${fk.source_table}-${fk.source_column}`;
      if (!renderedRel.has(relKey)) {
        renderedRel.add(relKey);
        mermaidLines.push(`    ${fk.target_table} ||--o{ ${fk.source_table} : "${fk.source_column}"`);
      }
    }
  }

  mermaidLines.push("");

  // Table definitions with columns
  const colsByTable: Record<string, any[]> = {};
  for (const col of columns) {
    if (!colsByTable[col.table_name]) colsByTable[col.table_name] = [];
    colsByTable[col.table_name].push(col);
  }

  for (const table of tables) {
    const tCols = colsByTable[table.table_name] || [];
    mermaidLines.push(`    ${table.table_name} {`);
    for (const c of tCols) {
      let typeStr = c.udt_name || c.data_type;
      let keyStr = "";
      if (c.column_name === "id") keyStr = "PK";
      else if (c.column_name.endsWith("_id")) keyStr = "FK";

      const nullableComment = c.is_nullable === "NO" ? "" : '"nullable"';
      mermaidLines.push(`        ${typeStr} ${c.column_name} ${keyStr} ${nullableComment}`.trimEnd());
    }
    mermaidLines.push(`    }`);
    mermaidLines.push("");
  }

  return `# Meseid Database Entity-Relationship Diagram (ERD)

This document provides the canonical Mermaid Entity-Relationship diagram and schema definition for the **Meseid Multi-Tenant Database Layer** (PostgreSQL 16), automatically generated from the live database catalog.

\`\`\`mermaid
${mermaidLines.join("\n")}
\`\`\`

---

## Table & Column Catalog

Total Registered Tables: **${tables.length}**

${tables
  .map((t) => {
    const tCols = colsByTable[t.table_name] || [];
    return `### Table: \`${t.table_name}\`
- **RLS Enabled:** \`${t.rls_enabled}\` | **RLS Forced:** \`${t.rls_forced}\`

| Column | Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
${tCols
  .map(
    (c) =>
      `| \`${c.column_name}\` | \`${c.udt_name || c.data_type}\` | \`${c.is_nullable}\` | ${c.column_default ? `\`${c.column_default.replace(/\|/g, "\\|")}\`` : "_none_"} |`
  )
  .join("\n")}
`;
  })
  .join("\n")}
`;
}

function generateDatabaseMarkdown(
  tables: any[],
  columns: any[],
  views: any[],
  grants: any[],
  routines: any[],
  triggers: any[]
): string {
  // Aggregate grants per table & role
  const grantsMap: Record<string, Record<string, string[]>> = {};

  for (const g of grants) {
    if (!grantsMap[g.table_name]) grantsMap[g.table_name] = {};
    if (!grantsMap[g.table_name][g.grantee]) grantsMap[g.table_name][g.grantee] = [];
    grantsMap[g.table_name][g.grantee].push(g.privilege_type);
  }

  const procedures = routines.filter((r) => r.routine_kind === "PROCEDURE");
  const functions = routines.filter((r) => r.routine_kind === "FUNCTION");

  return `# Meseid Database Architecture & Security Specification

This document details the multi-tenant PostgreSQL 16 database architecture for **Meseid**, including the connection role topology, session context mechanism, Row-Level Security (RLS) matrix, live table grants, triggers, functions, procedures, and views. Generated directly from the live database catalog.

---

## 1. Role Topology & Principle of Least Privilege

Meseid enforces zero-trust tenant isolation directly in the database engine using PostgreSQL roles, Row-Level Security (RLS), and session-bound authorization contexts.

\`\`\`text
                        ┌────────────────────────┐
                        │   POSTGRES_USER / DDL  │
                        │    (postgres/meseid)   │
                        └───────────┬────────────┘
                                    │ (migrations only)
                                    ▼
                        ┌────────────────────────┐
                        │       meseid_app       │ (LOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS)
                        │   Elysia API Runtime   │
                        └───────────┬────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │ (SET LOCAL ROLE)           │ (SET LOCAL ROLE)           │ (SET LOCAL ROLE)
       ▼                            ▼                            ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│   meseid_owner_ctx   │   │   meseid_admin_ctx   │   │  meseid_system_ctx   │
│ (Tenant RLS context) │   │ (Metadata & Ops Only │   │ (Ingestion, Quota &  │
│                      │   │  No Content Access)  │   │  Background Jobs)    │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
\`\`\`

1. **\`meseid_app\` (LOGIN)**:
   - The single login role used by the Elysia backend connection pool.
   - Configured with \`NOINHERIT\`, \`NOSUPERUSER\`, \`NOBYPASSRLS\`.
   - Granted membership into \`meseid_owner_ctx\`, \`meseid_admin_ctx\`, and \`meseid_system_ctx\`.
   - Has direct table privileges revoked on all tenant content tables. All operations must transition into a specific context role.
2. **\`meseid_owner_ctx\` (NOLOGIN)**:
   - Context role for authenticated tenant owners.
   - Enforces strict tenant isolation via RLS policies (\`USING (owner_id = app_owner_id())\`).
   - Append-only on financial ledgers (\`jurnal_umum\`, \`jurnal_baris\` have UPDATE and DELETE revoked).
   - Read-only access to tenant audit log (\`audit_log\`).
3. **\`meseid_admin_ctx\` (NOLOGIN)**:
   - Context role for platform administrators.
   - Granted read access to metadata tables (\`users\`, \`owners\`, \`plans\`, \`plan_prices\`, \`topup_packages\`, \`subscriptions\`), administrative views, \`system_logs\`, and \`alerts\`.
   - Read-only access to tenant-level \`audit_log\`.
   - Append-only access to \`admin_audit_log\` (SELECT, INSERT only; UPDATE and DELETE forbidden).
   - **Strictly denied read/write access to tenant content tables** (\`jurnal_umum\`, \`jurnal_baris\`, \`accounts\`, \`parties\`, \`buku_pembantu\`, \`documents\`, \`chat_logs\`, etc.).
   - Explicitly revoked from calling UU PDP erasure (\`delete_owner_data\`).
4. **\`meseid_system_ctx\` (NOLOGIN)**:
   - Context role for automated background workers, webhooks, message ingestion pipelines, and lazy quota rollover.
   - Access to \`inbound_messages\`, \`token_usage_logs\`, \`quota_counters\`, and \`pending_actions\` expiration.
5. **\`postgres\` / \`meseid\` (SUPERUSER)**:
   - Used exclusively during automated migrations and schema initialization.

---

## 2. Session Context Mechanism

Session identity is managed via PostgreSQL configuration parameters (\`app.owner_id\` and \`app.user_id\`) scoped strictly to the current database transaction (\`is_local = true\`).

### Session Variable Accessors
- **\`app_owner_id()\`**: Extracts \`current_setting('app.owner_id', true)::uuid\`. Returns \`NULL\` if unset or invalid.
- **\`app_user_id()\`**: Extracts \`current_setting('app.user_id', true)::uuid\`. Returns \`NULL\` if unset or invalid.

### TypeScript Unified Helper (\`withContext\`)
Located in [apps/api/src/db/client.ts](../apps/api/src/db/client.ts):

\`\`\`typescript
export async function withContext<T>(
  options: { role: ContextRole; ownerId?: string; userId?: string },
  fn: (tx: Tx) => Promise<T>
): Promise<T>
\`\`\`

When invoked:
1. \`tx.unsafe("SET LOCAL ROLE meseid_<role>_ctx")\` transitions the connection for the duration of the transaction.
2. \`tx.unsafe("SELECT set_config('app.owner_id', ..., true)")\` sets the tenant scope.
3. \`tx.unsafe("SELECT set_config('app.user_id', ..., true)")\` sets the acting user scope.
4. On transaction commit or rollback, the role and session variables revert automatically to default.

---

## 3. Row-Level Security (RLS) & Role Grant Matrix

The following matrix documents table RLS enforcement and live PostgreSQL role privileges:

| Table | RLS Status | \`meseid_owner_ctx\` | \`meseid_admin_ctx\` | \`meseid_system_ctx\` |
| :--- | :--- | :--- | :--- | :--- |
${tables
  .map((t) => {
    const tGrants = grantsMap[t.table_name] || {};
    const ownerG = tGrants["meseid_owner_ctx"] ? tGrants["meseid_owner_ctx"].sort().join(", ") : "**DENIED**";
    const adminG = tGrants["meseid_admin_ctx"] ? tGrants["meseid_admin_ctx"].sort().join(", ") : "**DENIED**";
    const sysG = tGrants["meseid_system_ctx"] ? tGrants["meseid_system_ctx"].sort().join(", ") : "**DENIED**";
    const rlsStr = t.rls_enabled ? (t.rls_forced ? "Enabled & Forced" : "Enabled") : "Disabled";
    return `| **${t.table_name}** | ${rlsStr} | ${ownerG} | ${adminG} | ${sysG} |`;
  })
  .join("\n")}

---

## 4. Comprehensive Inventory of Database Objects

### Stored Procedures
Total Procedures: **${procedures.length}**

${procedures
  .map(
    (p, i) => `${i + 1}. **\`${p.routine_name}(${p.identity_args})\`**
   - **Type:** \`${p.routine_kind}\` (\`${p.security_type}\`, \`${p.volatility}\`)`
  )
  .join("\n\n")}

### Stored Functions
Total Functions: **${functions.length}**

${functions
  .map(
    (f, i) => `${i + 1}. **\`${f.routine_name}(${f.identity_args})\`** -> \`${f.result_type}\`
   - **Type:** \`${f.routine_kind}\` (\`${f.security_type}\`, \`${f.volatility}\`)`
  )
  .join("\n\n")}

### Views
Total Views: **${views.length}** (All configured with \`security_invoker = true\`)

${views
  .map((v, i) => {
    return `${i + 1}. **\`${v.table_name}\`**`;
  })
  .join("\n")}

### Triggers
Total Triggers: **${triggers.length}**

| Table | Trigger Name | Event | Timing | Action Statement |
| :--- | :--- | :--- | :--- | :--- |
${triggers
  .map(
    (trg) =>
      `| \`${trg.table_name}\` | \`${trg.trigger_name}\` | \`${trg.event_manipulation}\` | \`${trg.action_timing}\` | \`${trg.action_statement.replace(/\|/g, "\\|")}\` |`
  )
  .join("\n")}
`;
}

if (import.meta.main) {
  generate().catch((err) => {
    console.error(">> [Meseid Docs Generator] ❌ Failed:", err);
    process.exit(1);
  });
}
