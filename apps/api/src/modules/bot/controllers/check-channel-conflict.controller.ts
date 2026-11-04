import type { Context } from "elysia";
import { env } from "../../../config/env";
import { adminSql } from "../../../db/client";
import { checkChannelConflict } from "../actions/check-channel-conflict.action";

/**
 * Controller untuk POST /api/internal/channel/check-conflict
 * Endpoint internal terproteksi secret untuk memeriksa konflik kepemilikan nomor/channel.
 */
export async function checkChannelConflictController(
  ctx: Context<{
    body: {
      channel: "whatsapp" | "telegram";
      external_account_id: string;
      session_id?: string;
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

  const { channel, external_account_id, session_id, owner_id } = ctx.body || {};
  if (!channel || !external_account_id) {
    ctx.set.status = 400;
    return {
      status: "error",
      error: "channel dan external_account_id wajib disertakan.",
    };
  }

  const result = await adminSql.begin(async (tx) => {
    return await checkChannelConflict(
      tx,
      channel,
      external_account_id,
      session_id,
      owner_id
    );
  });

  return {
    status: "ok",
    ...result,
  };
}
