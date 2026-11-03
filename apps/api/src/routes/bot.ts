import { Elysia, t } from "elysia";
import { requireOwner } from "../middleware/auth";
import {
  sendOtpController,
  verifyOtpController,
  getWhatsappStatusController,
  resetWhatsappSessionController,
  verifyTelegramTokenController,
} from "../modules/bot";

export const botRoutes = new Elysia()
  .use(requireOwner)

  // WhatsApp Gateway routes
  .get("/whatsapp/status", getWhatsappStatusController, {
    query: t.Optional(
      t.Object({
        sessionId: t.Optional(t.String()),
      })
    ),
  })
  .post("/whatsapp/reset", resetWhatsappSessionController, {
    body: t.Optional(
      t.Object({
        sessionId: t.Optional(t.String()),
      })
    ),
  })

  // Telegram Gateway verification route
  .post(
    "/telegram/verify",
    verifyTelegramTokenController,
    {
      body: t.Object({
        token: t.String(),
      }),
    }
  )

  // OTP Verification routes
  .group("/otp", (app) =>
    app
      .post(
        "/send",
        sendOtpController,
        {
          body: t.Object({
            phone: t.String(),
            channel: t.Optional(t.Union([t.Literal("whatsapp"), t.Literal("telegram")])),
          }),
        }
      )
      .post(
        "/verify",
        verifyOtpController,
        {
          body: t.Object({
            phone: t.String(),
            code: t.String(),
          }),
        }
      )
  );
