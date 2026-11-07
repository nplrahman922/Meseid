import type { Context } from "elysia";
import { env } from "../../../config/env";
import { adminSql } from "../../../db/client";
import { handleWhatsAppLoggedOutAction } from "../actions/handle-whatsapp-logged-out.action";

/**
 * Controller untuk POST /api/internal/whatsapp/on-logged-out
 * Menerima notifikasi internal saat sesi WhatsApp logout via HP (kode 401).
 */
export async function handleWhatsAppLoggedOutController(
  ctx: Context<{
    body: {
      session_id: string;
      owner_id?: string;
    };
    headers: { "x-internal-secret"?: string };
  }>
) {
  const secretHeader = ctx.headers["x-internal-secret"];
  if (!secretHeader || secretHeader !== env.INTERNAL_API_SECRET) {
    ctx.set.status = 401;
    return {
      status: "error",
      error: "Unauthorized internal service",
    };
  }

  const { session_id, owner_id } = ctx.body || {};
  if (!session_id) {
    ctx.set.status = 400;
    return {
      status: "error",
      error: "session_id wajib disertakan.",
    };
  }

  const result = await adminSql.begin(async (tx) => {
    return await handleWhatsAppLoggedOutAction(tx, session_id, owner_id);
  });

  return {
    status: "ok",
    data: result,
  };
}
