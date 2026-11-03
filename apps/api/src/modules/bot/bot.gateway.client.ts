import { env } from "../../config/env";
import { createModuleLogger } from "../../logs/logger";

const gatewayLogger = createModuleLogger("bot-gateway-client");

export interface WhatsappStatusResult {
  sessionId: string;
  status: "connecting" | "open" | "close" | "qr_ready" | "logged_out";
  qr: string | null;
  phoneNumber: string | null;
}

export interface TelegramVerifyResult {
  success: boolean;
  botId?: string;
  username?: string;
  firstName?: string;
  error?: string;
}

/**
 * Fetches real-time connection status and QR code for a WhatsApp session from the Bot Gateway.
 */
export async function getWhatsappStatus(sessionId: string = "default"): Promise<WhatsappStatusResult> {
  try {
    const res = await fetch(`${env.BOT_INTERNAL_URL}/whatsapp/qr/${sessionId}?format=json`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      gatewayLogger.warn(`Bot Gateway returned HTTP ${res.status} for WhatsApp status`);
      return {
        sessionId,
        status: "close",
        qr: null,
        phoneNumber: null,
      };
    }

    const data = (await res.json()) as any;
    return {
      sessionId: data.sessionId || sessionId,
      status: data.status || "connecting",
      qr: data.qr || null,
      phoneNumber: data.phoneNumber || null,
    };
  } catch (err: any) {
    gatewayLogger.warn(`Failed to connect to Bot Gateway: ${err.message}`);
    return {
      sessionId,
      status: "close",
      qr: null,
      phoneNumber: null,
    };
  }
}

/**
 * Purges previous session credentials and triggers a fresh QR code generation on the Bot Gateway.
 */
export async function resetWhatsappSession(sessionId: string = "default"): Promise<{
  success: boolean;
  message?: string;
  status?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${env.BOT_INTERNAL_URL}/whatsapp/session/reset/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      message: data.message,
      status: data.status || "connecting",
    };
  } catch (err: any) {
    gatewayLogger.error(`Failed to reset WhatsApp session via Bot Gateway`, err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Validates a custom Telegram bot token via Telegram getMe and registers it into active pool.
 */
export async function verifyTelegramBotToken(token: string): Promise<TelegramVerifyResult> {
  try {
    const res = await fetch(`${env.BOT_INTERNAL_URL}/telegram/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = (await res.json()) as any;
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Invalid token. Please check your BotFather token.",
      };
    }

    return {
      success: true,
      botId: data.botId,
      username: data.username,
      firstName: data.firstName,
    };
  } catch (err: any) {
    gatewayLogger.error(`Failed to verify Telegram token via Bot Gateway`, err);
    return {
      success: false,
      error: err.message,
    };
  }
}
