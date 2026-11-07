import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import {
  simulatePersonaChat,
  type SimulatePersonaChatInput,
} from "../actions/simulate-persona-chat.action";

/**
 * Controller untuk POST /api/owner/personalisasi/simulate
 * Menjalankan simulasi pertanyaan template ke AI dan mengembalikan respon nyata.
 */
export async function simulatePersonaChatController({
  body,
  owner,
  user,
  runOwnerTx,
  set,
}: {
  body: SimulatePersonaChatInput;
  owner: { id: string };
  user: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!body.message || !body.message.trim()) {
    return errorResponse(set, "BAD_REQUEST", "Pesan simulasi tidak boleh kosong.", 400);
  }

  try {
    const simulation = await runOwnerTx(async (tx) => {
      return await simulatePersonaChat(tx, owner.id, user.id, {
        persona: body.persona,
        message: body.message.trim(),
      });
    });

    return successResponse({ simulation }, "Simulasi percakapan persona berhasil.");
  } catch (err: any) {
    return errorResponse(
      set,
      "SIMULATION_FAILED",
      `Gagal menjalankan simulasi AI: ${err.message}`,
      500
    );
  }
}
