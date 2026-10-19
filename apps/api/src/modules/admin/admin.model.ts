import { Tx } from "../../db/client";

export interface AdminOverviewStats {
  users: number;
  owners: number;
}

/**
 * Retrieves high-level operational counts for users and tenant owners
 * within an active admin context transaction.
 */
export async function getAdminOverview(tx: Tx): Promise<AdminOverviewStats> {
  const [totalUsers] = await tx<{ count: string }[]>`
    SELECT count(*)::text as count FROM users;
  `;
  const [totalOwners] = await tx<{ count: string }[]>`
    SELECT count(*)::text as count FROM owners;
  `;

  return {
    users: parseInt(totalUsers.count, 10),
    owners: parseInt(totalOwners.count, 10),
  };
}
