import { Elysia, t } from "elysia";
import { generateTelegramOtpController } from "../modules/bot";

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
  });
