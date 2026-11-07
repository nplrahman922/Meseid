import { Tx } from "../../../db/client";

export interface TestTelegramConnectionResult {
  success: boolean;
  healthy: boolean;
  bot?: {
    id: string;
    username: string;
    firstName: string;
  };
  error?: string;
}

/**
 * Action to test Telegram bot connection health by pinging Telegram getMe API.
 */
export async function testTelegramConnectionAction(
  tx: Tx,
  ownerId: string
): Promise<TestTelegramConnectionResult> {
  const rows = await tx<{ external_account_id: string; status: string }[]>`
    SELECT external_account_id, status
    FROM channel_connections
    WHERE owner_id = ${ownerId}::uuid
      AND channel = 'telegram'
    LIMIT 1;
  `;

  if (rows.length === 0 || !rows[0].external_account_id) {
    return {
      success: false,
      healthy: false,
      error: "Belum ada bot Telegram yang terhubung pada akun Anda.",
    };
  }

  const token = rows[0].external_account_id.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as any;

    if (!data.ok || !data.result) {
      return {
        success: false,
        healthy: false,
        error: data.description || "Bot Telegram tidak merespons atau token telah kedaluwarsa.",
      };
    }

    return {
      success: true,
      healthy: true,
      bot: {
        id: String(data.result.id),
        username: data.result.username || "",
        firstName: data.result.first_name || "",
      },
    };
  } catch (err: any) {
    return {
      success: false,
      healthy: false,
      error: `Gagal menghubungi server Telegram: ${err.message}`,
    };
  }
}
