import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { ownerRoutes } from "./owner";
import { adminRoutes } from "./admin";
import { chatRoutes } from "./chat";
import { botRoutes } from "./bot";

export * from "./auth";
export * from "./owner";
export * from "./admin";
export * from "./chat";
export * from "./bot";

/**
 * Aggregated API Routes Plugin
 */
export const apiRoutes = new Elysia({ prefix: "/api" })
  .group("/auth", (app) => app.use(authRoutes))
  .group("/owner", (app) => app.use(ownerRoutes))
  .group("/admin", (app) => app.use(adminRoutes))
  .group("/chat", (app) => app.use(chatRoutes))
  .group("/bot", (app) => app.use(botRoutes));
