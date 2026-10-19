import { Elysia, t } from "elysia";
import { requireAuth, sessionPlugin } from "../middleware/auth";
import {
  googleAuthRedirectController,
  googleAuthCallbackController,
  logoutController,
  getMeController,
} from "../modules/auth/auth.controller";

export const authRoutes = new Elysia()
  .use(sessionPlugin)

  // 1. GET /api/auth/google
  .get(
    "/google",
    googleAuthRedirectController,
    {
      query: t.Optional(
        t.Object({
          redirect: t.Optional(t.String()),
          returnUrl: t.Optional(t.String()),
        })
      ),
    }
  )

  // 2. GET /api/auth/google/callback
  .get(
    "/google/callback",
    googleAuthCallbackController,
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
        error: t.Optional(t.String()),
        redirect: t.Optional(t.String()),
      }),
    }
  )

  // 3. POST /api/auth/logout
  .post("/logout", logoutController)

  // 4. GET /api/auth/me
  .use(requireAuth)
  .get("/me", getMeController);
