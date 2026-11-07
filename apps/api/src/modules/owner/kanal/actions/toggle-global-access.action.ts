import { Tx } from "../../../../db/client";

/**
 * Mengatur mode akses global pelanggan pada bot_configs ('open' vs 'whitelist').
 */
export async function toggleGlobalAccessAction(
  tx: Tx,
  ownerId: string,
  mode: "open" | "whitelist"
): Promise<{ customer_access_mode: "open" | "whitelist" }> {
  const [row] = await tx<{ customer_access_mode: "open" | "whitelist" }[]>`
    UPDATE bot_configs
    SET customer_access_mode = ${mode},
        updated_at = now()
    WHERE owner_id = ${ownerId}::uuid
    RETURNING customer_access_mode;
  `;

  return row || { customer_access_mode: mode };
}
