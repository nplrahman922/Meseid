import postgres from "postgres";

const rawDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://meseid:ganti-dengan-password-kuat@127.0.0.1:5432/meseid";
const DATABASE_URL = rawDbUrl.replace("@localhost:", "@127.0.0.1:");

const rawAppDbUrl =
  process.env.APP_DATABASE_URL ||
  "postgresql://meseid_app:meseid_app_secret_pass_123@127.0.0.1:5432/meseid";
const APP_DATABASE_URL = rawAppDbUrl.replace("@localhost:", "@127.0.0.1:");


/**
 * Superuser / Migration SQL client.
 * Connects as POSTGRES_USER with full DDL / schema alteration permissions.
 */
export const adminSql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Runtime Application SQL client.
 * Connects strictly as 'meseid_app' (NOINHERIT, NOSUPERUSER, NOBYPASSRLS).
 */
export const appSql = postgres(APP_DATABASE_URL, {
  max: 30,
  idle_timeout: 20,
  connect_timeout: 10,
});

export type Tx = postgres.TransactionSql;

export type ContextRole =
  | "owner"
  | "admin"
  | "system"
  | "meseid_owner_ctx"
  | "meseid_admin_ctx"
  | "meseid_system_ctx";

export interface ContextOptions {
  role: ContextRole;
  ownerId?: string | null;
  userId?: string | null;
}

/**
 * Executes a callback within a database transaction as meseid_app with a specified context role
 * (meseid_owner_ctx, meseid_admin_ctx, or meseid_system_ctx) and sets app.owner_id and app.user_id.
 */
export async function withContext<T>(
  options: ContextOptions,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  const roleName = options.role.startsWith("meseid_")
    ? options.role
    : `meseid_${options.role}_ctx`;

  const result = await appSql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE ${roleName}`);
    if (options.ownerId) {
      await tx`SELECT set_config('app.owner_id', ${options.ownerId}, true)`;
    } else {
      await tx`SELECT set_config('app.owner_id', '', true)`;
    }
    if (options.userId) {
      await tx`SELECT set_config('app.user_id', ${options.userId}, true)`;
    } else {
      await tx`SELECT set_config('app.user_id', '', true)`;
    }
    return await fn(tx);
  });
  return result as T;
}

/**
 * Executes a callback within a transaction scoped to a specific owner (tenant).
 * Applies 'SET LOCAL ROLE meseid_owner_ctx' and sets 'app.owner_id' and 'app.user_id'.
 */
export async function withOwnerContext<T>(
  ownerId: string,
  userId: string | null | undefined,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return withContext({ role: "owner", ownerId, userId }, fn);
}

/**
 * Executes a callback within an admin context.
 * Applies 'SET LOCAL ROLE meseid_admin_ctx' and sets 'app.user_id'.
 */
export async function withAdminContext<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return withContext({ role: "admin", userId }, fn);
}

/**
 * Executes a callback within a system background context (message pipeline, webhooks, scheduler).
 * Applies 'SET LOCAL ROLE meseid_system_ctx'.
 */
export async function withSystemContext<T>(
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return withContext({ role: "system" }, fn);
}

export type MaintenanceProcedureCall =
  | { procedure: "sp_purge_old_logs"; args?: [retentionDays?: number] }
  | { procedure: "sp_expire_pending_actions"; args?: [] };

/**
 * Executes a maintenance stored procedure outside of a transaction block.
 * Procedures that manage their own transactions via internal COMMIT statements
 * (such as sp_purge_old_logs) must not be called inside a transaction (i.e. not in withContext).
 * Only permitted procedures from an explicit allow-list with typed arguments are accepted.
 */
export async function runMaintenanceProcedure(
  call: MaintenanceProcedureCall,
  client: postgres.Sql = adminSql
): Promise<void> {
  if (call.procedure === "sp_purge_old_logs") {
    const days = call.args?.[0] ?? 30;
    if (!Number.isInteger(days) || days < 0) {
      throw new Error("sp_purge_old_logs argument must be a non-negative integer");
    }
    await client`CALL sp_purge_old_logs(${days})`;
  } else if (call.procedure === "sp_expire_pending_actions") {
    await client`CALL sp_expire_pending_actions()`;
  } else {
    throw new Error(`Procedure not permitted: ${(call as any).procedure}`);
  }
}

