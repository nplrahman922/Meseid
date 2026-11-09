import { Elysia, t } from "elysia";
import {
  generateTelegramOtpController,
  checkChannelConflictController,
  handleWhatsAppLoggedOutController,
} from "../modules/bot";

/**
 * Rute API Internal yang hanya dapat diakses antar-service (bot -> api)
 * Terproteksi dengan header x-internal-secret.
 */
export const internalRoutes = new Elysia({ prefix: "/internal" })
  .post("/telegram/generate-otp", generateTelegramOtpController, {
    body: t.Object({
      bot_id: t.String(),
      chat_id: t.String(),
    }),
  })
  .post("/channel/check-conflict", checkChannelConflictController, {
    body: t.Object({
      channel: t.Union([t.Literal("whatsapp"), t.Literal("telegram")]),
      external_account_id: t.String(),
      session_id: t.Optional(t.String()),
      owner_id: t.Optional(t.String()),
    }),
  })
  .post("/whatsapp/on-logged-out", handleWhatsAppLoggedOutController, {
    body: t.Object({
      session_id: t.String(),
      owner_id: t.Optional(t.String()),
    }),
  });
