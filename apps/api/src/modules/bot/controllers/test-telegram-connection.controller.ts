import { Tx } from "../../../db/client";
import { successResponse, errorResponse } from "../../../logs";
import { testTelegramConnectionAction } from "../actions/test-telegram-connection.action";

/**
 * Controller for POST /api/bot/telegram/test
 */
export async function testTelegramConnectionController({
  owner,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const result = await runOwnerTx(async (tx) => {
      return await testTelegramConnectionAction(tx, owner.id);
    });

    if (!result.success || !result.healthy) {
      set.status = 400;
      return {
        status: "error",
        error: "TELEGRAM_UNHEALTHY",
        message: result.error || "Koneksi Telegram tidak sehat.",
      };
    }

    return successResponse(result, "Koneksi bot Telegram aktif dan responsif.");
  } catch (err: any) {
    return errorResponse(
      set,
      "TEST_FAILED",
      err.message || "Gagal menguji koneksi Telegram.",
      500
    );
  }
}
