import { Tx } from "../../../../db/client";
import { getOwnerProfileAndBotConfig } from "../actions/get-profile.action";

/**
 * Controller untuk GET /api/owner/profile
 */
export async function getOwnerProfileController({
  owner,
  user,
  runOwnerTx,
}: {
  owner: { id: string };
  user: { id: string; email: string; role: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const profile = await runOwnerTx(async (tx) => {
    return await getOwnerProfileAndBotConfig(tx, owner.id);
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    owner: profile.owner,
    bot_config: profile.botConfig,
  };
}
