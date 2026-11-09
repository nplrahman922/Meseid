import { Tx } from "../../../../db/client";
import type { GoogleCalendarStatusPayload } from "../jadwal.types";

/**
 * Memeriksa status konektivitas akun Google Calendar dan permission scope milik owner.
 */
export async function getGoogleStatusAction(
  tx: Tx,
  ownerId: string
): Promise<GoogleCalendarStatusPayload> {
  const rows = await tx<{
    scopes: string[];
    calendar_id: string | null;
    status: string;
    updated_at: Date;
  }[]>`
    SELECT scopes, calendar_id, status, updated_at
    FROM google_connections
    WHERE owner_id = ${ownerId}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return {
      connected: false,
      calendarId: "primary",
      scopes: [],
      hasCalendarScope: false,
      lastSyncedAt: null,
    };
  }

  const conn = rows[0]!;
  const hasCalendarScope = Boolean(
    conn.scopes?.some((s) => s.includes("calendar"))
  );

  return {
    connected: conn.status === "connected" && hasCalendarScope,
    calendarId: conn.calendar_id || "primary",
    scopes: conn.scopes || [],
    hasCalendarScope,
    lastSyncedAt: conn.updated_at ? conn.updated_at.toISOString() : null,
  };
}
