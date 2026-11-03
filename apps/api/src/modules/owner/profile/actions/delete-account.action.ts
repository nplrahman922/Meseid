import { Tx } from "../../../../db/client";

/**
 * Menjalankan fungsi stored procedure database `delete_owner_data`
 * untuk menghapus seluruh data tenant sesuai kepatuhan hak UU PDP (Right to Erasure).
 */
export async function deleteOwnerData(
  tx: Tx,
  ownerId: string
): Promise<void> {
  await tx`SELECT delete_owner_data(${ownerId}::uuid);`;
}
