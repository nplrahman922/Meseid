import { Tx } from "../../../db/client";
import { successResponse, errorResponse } from "../../../logs";
import { disconnectTelegramAction } from "../actions/disconnect-telegram.action";

/**
 * Controller for POST /api/bot/telegram/disconnect
 */
export async function disconnectTelegramController({
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
      return await disconnectTelegramAction(tx, owner.id);
    });

    return successResponse({ data: result }, result.message);
  } catch (err: any) {
    return errorResponse(
      set,
      "DISCONNECT_FAILED",
      err.message || "Gagal memutuskan koneksi Telegram.",
      500
    );
  }
}
