import { Elysia } from "elysia";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { ownerProfileRoutes } from "./routes/owner_profile";
import { adminRoutes } from "./routes/admin";

export const app = new Elysia()
  .get("/", () => "Meseid API Service")
  .get("/health", () => ({ status: "ok" }))
  .get("/api/health", () => ({ status: "ok" }))
  .group("/api/auth", (app) => app.use(authRoutes))
  .group("/api/owner", (app) => app.use(ownerProfileRoutes))
  .group("/api/admin", (app) => app.use(adminRoutes));

if (import.meta.main) {
  app.listen(env.PORT);
  console.log(
    `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
  );
}
