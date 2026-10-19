import { Elysia } from "elysia";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { ownerRoutes } from "./routes/owner";
import { adminRoutes } from "./routes/admin";
import { createModuleLogger, errorResponse } from "./logs";

export const app = new Elysia()
  .onError(({ code, error, set, request }) => {
    const url = new URL(request.url);
    // Otomatis deteksi modul dari path (misal: /api/auth -> auth, /api/owner -> owner)
    const segments = url.pathname.replace(/^\//, "").split("/");
    const moduleName = segments[0] === "api" && segments[1] ? segments[1] : "system";
    const moduleLogger = createModuleLogger(moduleName);

    moduleLogger.error(`[System Error] ${code} on ${request.method} ${url.pathname}`, error, {
      code,
      path: url.pathname,
      method: request.method,
      module: moduleName,
    });

    if (code === "NOT_FOUND") {
      return errorResponse(set, "NOT_FOUND", "Endpoint yang Anda tuju tidak ditemukan.", 404);
    }

    if (code === "VALIDATION") {
      return errorResponse(
        set,
        "VALIDATION_ERROR",
        error.message || "Validasi parameter gagal.",
        400
      );
    }

    return errorResponse(
      set,
      "INTERNAL_SERVER_ERROR",
      error.message || "Terjadi kesalahan internal pada server.",
      500
    );
  })
  .get("/", () => "Meseid API Service")
  .get("/health", () => ({ status: "ok" }))
  .get("/api/health", () => ({ status: "ok" }))
  .group("/api/auth", (app) => app.use(authRoutes))
  .group("/api/owner", (app) => app.use(ownerRoutes))
  .group("/api/admin", (app) => app.use(adminRoutes));

if (import.meta.main) {
  app.listen(env.PORT);
  console.log(
    `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
  );
}
