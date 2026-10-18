import { Elysia, t } from "elysia";
import { requireOwner } from "../middleware/auth";
import { SESSION_COOKIE_NAME } from "../lib/session";

/**
 * Validates whether a timezone identifier is a recognized IANA timezone.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const VALID_BUSINESS_TYPES = ["kuliner", "toko", "jasa", "lainnya"] as const;

export const ownerProfileRoutes = new Elysia()
  .use(requireOwner)

  // 1. GET /api/owner/profile
  .get("/profile", async ({ owner, user, runOwnerTx }) => {
    return await runOwnerTx(async (tx) => {
      const [ownerDetails] = await tx<{
        id: string;
        business_name: string;
        business_type: string;
        timezone: string;
        status: string;
        created_at: Date;
        updated_at: Date;
      }[]>`
        SELECT id, business_name, business_type, timezone, status, created_at, updated_at
        FROM owners
        WHERE id = ${owner.id}::uuid;
      `;

      const [botConfig] = await tx<{
        assistant_bot_name: string;
        assistant_persona_prompt: string | null;
        admin_bot_name: string;
        admin_persona_prompt: string | null;
        persona_prompt: string | null;
        selected_model_id: string | null;
        customer_access_mode: string;
        allowed_contacts: any;
        allowed_groups: any;
        auto_reply_enabled: boolean;
        business_hours: any;
      }[]>`
        SELECT assistant_bot_name, assistant_persona_prompt, admin_bot_name, admin_persona_prompt,
               persona_prompt, selected_model_id, customer_access_mode, allowed_contacts, allowed_groups,
               auto_reply_enabled, business_hours
        FROM bot_configs
        WHERE owner_id = ${owner.id}::uuid;
      `;

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        owner: ownerDetails,
        bot_config: botConfig || null,
      };
    });
  })

  // 2. PUT /api/owner/profile
  .put(
    "/profile",
    async ({ body, owner, runOwnerTx, set }) => {
      const { business_name, business_type, timezone } = body;

      // Validate business_name
      if (business_name !== undefined) {
        if (typeof business_name !== "string" || business_name.trim().length === 0) {
          set.status = 400;
          return {
            error: "VALIDATION_ERROR",
            message: "Nama bisnis tidak boleh kosong.",
          };
        }
      }

      // Validate business_type
      if (business_type !== undefined) {
        if (!VALID_BUSINESS_TYPES.includes(business_type as any)) {
          set.status = 400;
          return {
            error: "VALIDATION_ERROR",
            message: `Tipe bisnis tidak valid. Pilihan: ${VALID_BUSINESS_TYPES.join(", ")}.`,
          };
        }
      }

      // Validate timezone
      if (timezone !== undefined) {
        if (typeof timezone !== "string" || !isValidTimeZone(timezone)) {
          set.status = 400;
          return {
            error: "VALIDATION_ERROR",
            message: "Timezone tidak valid. Gunakan format IANA seperti 'Asia/Jakarta'.",
          };
        }
      }

      const updatedOwner = await runOwnerTx(async (tx) => {
        const [updated] = await tx<{
          id: string;
          business_name: string;
          business_type: string;
          timezone: string;
          status: string;
          updated_at: Date;
        }[]>`
          UPDATE owners
          SET business_name = COALESCE(${business_name?.trim() || null}, business_name),
              business_type = COALESCE(${business_type || null}, business_type),
              timezone = COALESCE(${timezone || null}, timezone),
              updated_at = now()
          WHERE id = ${owner.id}::uuid
          RETURNING id, business_name, business_type, timezone, status, updated_at;
        `;
        return updated;
      });

      return {
        status: "ok",
        message: "Profil bisnis berhasil diperbarui.",
        owner: updatedOwner,
      };
    },
    {
      body: t.Object({
        business_name: t.Optional(t.String()),
        business_type: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    }
  )

  // 3. DELETE /api/owner/account (UU PDP Right to Erasure)
  .delete(
    "/account",
    async ({ body, owner, runOwnerTx, cookie, set }) => {
      if (body?.confirm !== "HAPUS_DATA_SAYA") {
        set.status = 400;
        return {
          error: "CONFIRMATION_REQUIRED",
          message: "Konfirmasi HAPUS_DATA_SAYA diperlukan untuk menghapus akun secara permanen.",
        };
      }

      // Execute erasure procedure delete_owner_data(app_owner_id()) under owner context
      await runOwnerTx(async (tx) => {
        await tx`SELECT delete_owner_data(${owner.id}::uuid);`;
      });

      // Clear session cookie
      cookie[SESSION_COOKIE_NAME]?.remove();

      return {
        status: "ok",
        message: "Seluruh data akun Anda telah berhasil dihapus sesuai UU PDP.",
      };
    },
    {
      body: t.Object({
        confirm: t.String(),
      }),
    }
  );
