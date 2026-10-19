import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { ownerRoutes } from "./owner";
import { adminRoutes } from "./admin";

export * from "./auth";
export * from "./owner";
export * from "./admin";

/**
 * Aggregated API Routes Plugin
 */
export const apiRoutes = new Elysia({ prefix: "/api" })
  .group("/auth", (app) => app.use(authRoutes))
  .group("/owner", (app) => app.use(ownerRoutes))
  .group("/admin", (app) => app.use(adminRoutes));

