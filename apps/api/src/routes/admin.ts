import { Elysia } from "elysia";
import { requireAdmin } from "../middleware/auth";
import { getAdminOverviewController } from "../modules/admin/admin.controller";

export const adminRoutes = new Elysia()
  .use(requireAdmin)
  .get("/overview", getAdminOverviewController);
