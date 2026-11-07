import { Tx } from "../../../db/client";
import { successResponse, errorResponse } from "../../../logs";
import { disconnectWhatsappAction } from "../actions/disconnect-whatsapp.action";

/**
 * Controller for POST /api/bot/whatsapp/disconnect
 */
export async function disconnectWhatsappController({
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
      return await disconnectWhatsappAction(tx, owner.id);
    });

    return successResponse({ data: result }, result.message);
  } catch (err: any) {
    return errorResponse(
      set,
      "DISCONNECT_FAILED",
      err.message || "Gagal memutuskan koneksi WhatsApp.",
      500
    );
  }
}
