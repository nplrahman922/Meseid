import { Elysia } from "elysia";
import { requireAdmin } from "../middleware/auth";

export const adminRoutes = new Elysia()
  .use(requireAdmin)
  .get("/overview", async ({ runAdminTx }) => {
    return await runAdminTx(async (tx) => {
      const [totalUsers] = await tx<{ count: string }[]>`
        SELECT count(*)::text as count FROM users;
      `;
      const [totalOwners] = await tx<{ count: string }[]>`
        SELECT count(*)::text as count FROM owners;
      `;
      return {
        status: "ok",
        message: "Admin overview",
        stats: {
          users: parseInt(totalUsers.count, 10),
          owners: parseInt(totalOwners.count, 10),
        },
      };
    });
  });
