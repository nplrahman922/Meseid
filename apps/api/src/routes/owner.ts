import { Elysia, t } from "elysia";
import { requireOwner } from "../middleware/auth";
import {
  getOwnerProfileController,
  updateOwnerProfileController,
  deleteOwnerAccountController,
} from "../modules/owner/owner.controller";

export const ownerRoutes = new Elysia()
  .use(requireOwner)

  // 1. GET /api/owner/profile
  .get("/profile", getOwnerProfileController)

  // 2. PUT /api/owner/profile
  .put(
    "/profile",
    updateOwnerProfileController,
    {
      body: t.Object({
        business_name: t.Optional(t.String()),
        business_type: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    }
  )

  // 3. DELETE /api/owner/account (UU PDP Right to Erasure)
  .delete(
    "/account",
    deleteOwnerAccountController,
    {
      body: t.Object({
        confirm: t.String(),
      }),
    }
  );

export const ownerProfileRoutes = ownerRoutes;
