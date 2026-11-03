import { Elysia } from "elysia";
import { requireAdmin } from "../middleware/auth";
import {
  getAdminOverviewController,
  syncAiModelsController,
  getAiModelsController,
  toggleAiModelController,
} from "../modules/admin/admin.controller";

export const adminRoutes = new Elysia()
  .use(requireAdmin)
  .get("/overview", getAdminOverviewController)
  .get("/ai/models", getAiModelsController)
  .post("/ai/sync", syncAiModelsController)
  .patch("/ai/models/toggle", toggleAiModelController);

