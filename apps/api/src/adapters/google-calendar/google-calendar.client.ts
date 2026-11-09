import { Tx } from "../../db/client";
import { env } from "../../config/env";
import { decryptBytes, encryptBytes } from "../../lib/crypto";
import { createModuleLogger } from "../../logs";
import type {
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  GoogleFreeBusySlot,
} from "./google-calendar.types";

const calLogger = createModuleLogger("google-calendar-client");
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarClient {
  /**
   * Mengambil access token aktif. Jika token kedaluwarsa, lakukan refresh otomatis via OAuth.
   */
  static async getValidAccessToken(tx: Tx, ownerId: string): Promise<string | null> {
    const connRows = await tx<{
      access_token_enc: Buffer | null;
      refresh_token_enc: Buffer | null;
      token_expires_at: Date | null;
      scopes: string[];
      status: string;
    }[]>`
      SELECT access_token_enc, refresh_token_enc, token_expires_at, scopes, status
      FROM google_connections
      WHERE owner_id = ${ownerId}
      LIMIT 1;
    `;

    const conn = connRows[0];
    if (!conn || conn.status === "revoked") {
      return null;
    }

    const hasCalendarScope = conn.scopes?.some((s) => s.includes("calendar"));
    if (!hasCalendarScope) {
      return null;
    }

    const now = new Date();
    const expiry = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
    const isStillValid = expiry && expiry.getTime() - now.getTime() > 120_000;

    if (isStillValid && conn.access_token_enc) {
      try {
        return decryptBytes(conn.access_token_enc);
      } catch (err: any) {
        calLogger.warn("Gagal mendekripsi access_token_enc, mencoba refresh token", { error: err.message });
      }
    }

    if (!conn.refresh_token_enc) {
      return null;
    }

    let refreshToken: string;
    try {
      refreshToken = decryptBytes(conn.refresh_token_enc);
    } catch (err: any) {
      calLogger.error("Gagal mendekripsi refresh_token_enc", err);
      return null;
    }

    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        calLogger.error(`Gagal refresh token Google: ${errorText}`);
        if (res.status === 400 || res.status === 401) {
          await tx`
            UPDATE google_connections
            SET status = 'revoked', updated_at = now()
            WHERE owner_id = ${ownerId};
          `;
        }
        return null;
      }

      const tokenData = (await res.json()) as { access_token: string; expires_in: number };
      const newAccessEnc = encryptBytes(tokenData.access_token);
      const newExpiry = new Date(Date.now() + (tokenData.expires_in - 60) * 1000);

      await tx`
        UPDATE google_connections
        SET access_token_enc = ${newAccessEnc},
            token_expires_at = ${newExpiry},
            status = 'connected',
            updated_at = now()
        WHERE owner_id = ${ownerId};
      `;

      return tokenData.access_token;
    } catch (err: any) {
      calLogger.error(`Koneksi refresh token gagal: ${err.message}`, err);
      return null;
    }
  }

  /**
   * Menambahkan event baru ke kalender primary pemilik.
   */
  static async createCalendarEvent(
    tx: Tx,
    ownerId: string,
    event: GoogleCalendarEventInput
  ): Promise<GoogleCalendarEvent | null> {
    const accessToken = await this.getValidAccessToken(tx, ownerId);
    if (!accessToken) return null;

    try {
      const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        const errText = await res.text();
        calLogger.error(`Gagal membuat event di Google Calendar: ${errText}`);
        return null;
      }

      return (await res.json()) as GoogleCalendarEvent;
    } catch (err: any) {
      calLogger.error(`Exception saat createCalendarEvent: ${err.message}`, err);
      return null;
    }
  }

  /**
   * Menghapus event dari kalender Google.
   */
  static async deleteCalendarEvent(tx: Tx, ownerId: string, googleEventId: string): Promise<boolean> {
    const accessToken = await this.getValidAccessToken(tx, ownerId);
    if (!accessToken) return false;

    try {
      const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${googleEventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return res.status === 204 || res.status === 404;
    } catch (err: any) {
      calLogger.error(`Exception saat deleteCalendarEvent: ${err.message}`, err);
      return false;
    }
  }

  /**
   * Mengambil daftar event dari Google Calendar pada rentang waktu tertentu.
   */
  static async listCalendarEvents(
    tx: Tx,
    ownerId: string,
    timeMin: string,
    timeMax: string
  ): Promise<GoogleCalendarEvent[]> {
    const accessToken = await this.getValidAccessToken(tx, ownerId);
    if (!accessToken) return [];

    try {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });

      const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) return [];
      const data = (await res.json()) as { items?: GoogleCalendarEvent[] };
      return data.items || [];
    } catch (err: any) {
      calLogger.error(`Exception saat listCalendarEvents: ${err.message}`, err);
      return [];
    }
  }

  /**
   * Mengecek slot sibuk (FreeBusy query) langsung ke Google Calendar.
   */
  static async queryFreeBusy(
    tx: Tx,
    ownerId: string,
    timeMin: string,
    timeMax: string
  ): Promise<GoogleFreeBusySlot[]> {
    const accessToken = await this.getValidAccessToken(tx, ownerId);
    if (!accessToken) return [];

    try {
      const res = await fetch(`${CALENDAR_API_BASE}/freeBusy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: "primary" }],
        }),
      });

      if (!res.ok) return [];
      const data = (await res.json()) as { calendars?: { primary?: { busy?: GoogleFreeBusySlot[] } } };
      return data.calendars?.primary?.busy || [];
    } catch (err: any) {
      calLogger.error(`Exception saat queryFreeBusy: ${err.message}`, err);
      return [];
    }
  }
}
