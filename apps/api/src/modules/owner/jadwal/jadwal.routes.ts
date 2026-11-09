import { Elysia, t } from "elysia";
import {
  getSchedulesController,
  createScheduleController,
  deleteScheduleController,
  listBookingsController,
  respondBookingController,
  getGoogleStatusController,
  syncGoogleCalendarController,
} from "./index";

export const jadwalRoutes = new Elysia({ prefix: "/jadwal" })
  // 1. GET /api/owner/jadwal/schedules
  .get("/schedules", getSchedulesController as any, {
    query: t.Optional(
      t.Object({
        timeMin: t.Optional(t.String()),
        timeMax: t.Optional(t.String()),
      })
    ),
  })

  // 2. POST /api/owner/jadwal/schedules
  .post("/schedules", createScheduleController as any, {
    body: t.Object({
      title: t.String(),
      start_at: t.String(),
      end_at: t.String(),
      source: t.Optional(t.Union([t.Literal("dashboard"), t.Literal("chat"), t.Literal("booking")])),
      description: t.Optional(t.String()),
    }),
  })

  // 3. DELETE /api/owner/jadwal/schedules/:id
  .delete("/schedules/:id", deleteScheduleController as any)

  // 4. GET /api/owner/jadwal/bookings
  .get("/bookings", listBookingsController as any, {
    query: t.Optional(
      t.Object({
        status: t.Optional(
          t.Union([
            t.Literal("pending"),
            t.Literal("approved"),
            t.Literal("rejected"),
            t.Literal("cancelled"),
          ])
        ),
      })
    ),
  })

  // 5. POST /api/owner/jadwal/bookings/:id/respond
  .post("/bookings/:id/respond", respondBookingController as any, {
    body: t.Object({
      action: t.Union([t.Literal("approve"), t.Literal("reject")]),
      notes: t.Optional(t.String()),
    }),
  })

  // 6. GET /api/owner/jadwal/google-status
  .get("/google-status", getGoogleStatusController as any)

  // 7. POST /api/owner/jadwal/sync-google
  .post("/sync-google", syncGoogleCalendarController as any);
