import { adminSql, withSystemContext, Tx } from "../../db/client";
import { encryptBytes } from "../../lib/crypto";

export interface UserRecord {
  id: string;
  email: string;
  role: "owner" | "admin";
  status: "active" | "suspended" | "deleted";
  google_sub?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface OwnerRecord {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  timezone: string;
  status: string;
  suspended_reason: string | null;
}

export interface OwnerSubscriptionDetails {
  plan_name: string;
  display_name: string;
  status: string;
  current_period_end: Date | null;
}

export interface ProvisionOwnerInput {
  googleSub: string;
  email: string;
  name?: string;
  tokens?: {
    access_token?: string;
    refresh_token?: string;
  };
}

export interface ProvisionOwnerResult {
  user: {
    id: string;
    email: string;
    role: "owner";
    status: string;
  };
  owner: {
    id: string;
    business_name: string;
    business_type: string;
    timezone: string;
  };
}

/**
 * Finds a user by ID using system context (or an existing transaction).
 */
export async function findUserById(
  userId: string,
  tx?: Tx
): Promise<UserRecord | null> {
  if (tx) {
    const [row] = await tx<UserRecord[]>`
      SELECT id, email, role, status FROM users WHERE id = ${userId}::uuid;
    `;
    return row || null;
  }

  const [row] = await withSystemContext(async (systemTx) => {
    return await systemTx<UserRecord[]>`
      SELECT id, email, role, status FROM users WHERE id = ${userId}::uuid;
    `;
  });
  return row || null;
}

/**
 * Finds a user by Google sub identifier or normalized email address.
 */
export async function findUserByGoogleOrEmail(
  googleSub: string,
  normalizedEmail: string,
  tx?: Tx
): Promise<UserRecord | null> {
  const runner = async (contextTx: Tx) => {
    return await contextTx<UserRecord[]>`
      SELECT id, email, role, status FROM users 
      WHERE google_sub = ${googleSub} OR LOWER(email) = ${normalizedEmail}
      LIMIT 1;
    `;
  };

  const rows = tx ? await runner(tx) : await withSystemContext(runner);
  return rows[0] || null;
}

/**
 * Finds an owner tenant profile by the associated user ID.
 */
export async function findOwnerByUserId(
  userId: string,
  tx?: Tx
): Promise<OwnerRecord | null> {
  const runner = async (contextTx: Tx) => {
    return await contextTx<OwnerRecord[]>`
      SELECT id, user_id, business_name, business_type, timezone, status, suspended_reason
      FROM owners
      WHERE user_id = ${userId}::uuid;
    `;
  };

  const rows = tx ? await runner(tx) : await withSystemContext(runner);
  return rows[0] || null;
}

/**
 * Updates an existing user's role and Google sub identifier.
 */
export async function updateUserRoleAndGoogleSub(
  userId: string,
  role: "owner" | "admin",
  googleSub: string
): Promise<void> {
  await adminSql`
    UPDATE users
    SET role = ${role}, google_sub = ${googleSub}, updated_at = now()
    WHERE id = ${userId}::uuid;
  `;
}

/**
 * Updates an existing user's Google sub and email address.
 */
export async function updateUserGoogleSubAndEmail(
  userId: string,
  googleSub: string,
  email: string
): Promise<void> {
  await adminSql`
    UPDATE users
    SET google_sub = ${googleSub}, email = ${email}, updated_at = now()
    WHERE id = ${userId}::uuid;
  `;
}

/**
 * Creates a new administrator user record.
 */
export async function createAdminUser(data: {
  googleSub: string;
  email: string;
}): Promise<UserRecord> {
  const [newAdmin] = await adminSql<UserRecord[]>`
    INSERT INTO users (google_sub, email, role, status)
    VALUES (${data.googleSub}, ${data.email}, 'admin', 'active')
    RETURNING id, email, role, status;
  `;
  return newAdmin;
}

/**
 * Auto-provisions a brand new Owner tenant including default accounts,
 * bot configurations, initial free subscription, and encrypted Google credentials.
 */
export async function provisionNewOwner(
  input: ProvisionOwnerInput
): Promise<ProvisionOwnerResult> {
  const businessName = input.name ? `Bisnis ${input.name}` : "Bisnis Saya";

  return await adminSql.begin(async (tx) => {
    // 1. Insert user
    const [newUser] = await tx<{ id: string; email: string; role: "owner"; status: string }[]>`
      INSERT INTO users (google_sub, email, role, status)
      VALUES (${input.googleSub}, ${input.email}, 'owner', 'active')
      RETURNING id, email, role, status;
    `;

    // 2. Insert owner (automatically triggers default accounts seeding via trg_seed_default_accounts)
    const [newOwner] = await tx<{ id: string; business_name: string; business_type: string; timezone: string }[]>`
      INSERT INTO owners (user_id, business_name, business_type, timezone, status)
      VALUES (${newUser.id}, ${businessName}, 'lainnya', 'Asia/Jakarta', 'active')
      RETURNING id, business_name, business_type, timezone;
    `;

    // 3. Insert default bot_configs
    await tx`
      INSERT INTO bot_configs (
        owner_id,
        assistant_bot_name,
        assistant_persona_prompt,
        admin_bot_name,
        admin_persona_prompt,
        persona_prompt,
        selected_model_id,
        customer_access_mode,
        auto_reply_enabled,
        business_hours
      ) VALUES (
        ${newOwner.id},
        'Asisten Bisnis',
        'Kamu adalah asisten internal pemilik bisnis untuk membantu pembukuan, stok, dan laporan keuangan.',
        'Admin Toko',
        'Kamu adalah asisten ramah toko yang melayani pertanyaan produk dan pesanan pelanggan.',
        'Kamu adalah asisten ramah toko.',
        'gemini-1.5-flash',
        'open',
        true,
        '{}'::jsonb
      );
    `;

    // 4. Assign default free subscription (name = 'gratis' or 'free') if exists
    const [freePlan] = await tx<{ id: string }[]>`
      SELECT id FROM plans WHERE name IN ('gratis', 'free') LIMIT 1;
    `;

    if (freePlan) {
      await tx`
        INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
        VALUES (${newOwner.id}, ${freePlan.id}, 'active', now(), now() + interval '30 days')
        ON CONFLICT (owner_id) DO NOTHING;
      `;
    }

    // 5. Store Google tokens encrypted if available
    if (input.tokens?.access_token || input.tokens?.refresh_token) {
      const accessEnc = input.tokens.access_token ? encryptBytes(input.tokens.access_token) : null;
      const refreshEnc = input.tokens.refresh_token ? encryptBytes(input.tokens.refresh_token) : null;

      await tx`
        INSERT INTO google_connections (owner_id, access_token_enc, refresh_token_enc, status)
        VALUES (${newOwner.id}, ${accessEnc}, ${refreshEnc}, 'connected')
        ON CONFLICT (owner_id) DO UPDATE
        SET access_token_enc = EXCLUDED.access_token_enc,
            refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, google_connections.refresh_token_enc),
            status = 'connected',
            updated_at = now();
      `;
    }

    return { user: newUser, owner: newOwner };
  });
}

/**
 * Retrieves owner profile and active subscription summary for /me endpoint.
 */
export async function getMeOwnerDetails(userId: string): Promise<{
  owner: {
    id: string;
    business_name: string;
    business_type: string;
    timezone: string;
    status: string;
  } | null;
  subscription: OwnerSubscriptionDetails | null;
}> {
  return await withSystemContext(async (tx) => {
    const [ownerRow] = await tx<{
      id: string;
      business_name: string;
      business_type: string;
      timezone: string;
      status: string;
    }[]>`
      SELECT id, business_name, business_type, timezone, status
      FROM owners
      WHERE user_id = ${userId}::uuid;
    `;

    if (!ownerRow) {
      return { owner: null, subscription: null };
    }

    const [subRow] = await tx<OwnerSubscriptionDetails[]>`
      SELECT p.name AS plan_name, p.display_name, s.status, s.current_period_end
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.owner_id = ${ownerRow.id}::uuid;
    `;

    return {
      owner: ownerRow,
      subscription: subRow || null,
    };
  });
}
