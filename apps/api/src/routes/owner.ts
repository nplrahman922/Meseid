import { Elysia, t } from "elysia";
import { requireOwner } from "../middleware/auth";
import {
  getOwnerProfileController,
  updateOwnerProfileController,
  deleteOwnerAccountController,
  getPersonalisasiController,
  updatePersonalisasiController,
  getAvailableBotModelsController,
  listKnowledgeBaseController,
  createKnowledgeBaseController,
  batchCreateKnowledgeBaseController,
  updateKnowledgeBaseController,
  deleteKnowledgeBaseController,
  submitOnboardingController,
  getOnboardingStatusController,
  getOnboardingDetailController,
} from "../modules/owner";

export const ownerRoutes = new Elysia()
  .use(requireOwner)

  // ==========================================
  // 1. Profile Sub-Module
  // ==========================================
  // GET /api/owner/profile
  .get("/profile", getOwnerProfileController)

  // PUT /api/owner/profile
  .put(
    "/profile",
    updateOwnerProfileController,
    {
      body: t.Object({
        business_name: t.Optional(t.String()),
        business_type: t.Optional(t.String()),
        custom_business_type: t.Optional(t.String()),
        business_description: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    }
  )

  // DELETE /api/owner/account (UU PDP Right to Erasure)
  .delete(
    "/account",
    deleteOwnerAccountController,
    {
      body: t.Object({
        confirm: t.String(),
      }),
    }
  )

  // ==========================================
  // 2. Personalisasi Sub-Module
  // ==========================================
  // GET /api/owner/personalisasi/models
  .get("/personalisasi/models", getAvailableBotModelsController)

  // GET /api/owner/personalisasi
  .get("/personalisasi", getPersonalisasiController)

  // PUT /api/owner/personalisasi
  .put(
    "/personalisasi",
    updatePersonalisasiController,
    {
      body: t.Object({
        admin_bot_name: t.Optional(t.String()),
        assistant_bot_name: t.Optional(t.String()),
        admin_persona_prompt: t.Optional(t.String()),
        assistant_persona_prompt: t.Optional(t.String()),
        speaking_styles: t.Optional(t.Array(t.String())),
        custom_rules: t.Optional(t.Array(t.String())),
        selected_model_id: t.Optional(t.String()),
        customer_access_mode: t.Optional(t.Union([t.Literal("open"), t.Literal("whitelist")])),
        allowed_contacts: t.Optional(t.Any()),
        allowed_groups: t.Optional(t.Any()),
        auto_reply_enabled: t.Optional(t.Boolean()),
        business_hours: t.Optional(t.Any()),
      }),
    }
  )

  // ==========================================
  // 3. Knowledge Base Sub-Module
  // ==========================================
  // GET /api/owner/kb
  .get(
    "/kb",
    listKnowledgeBaseController,
    {
      query: t.Object({
        category: t.Optional(t.String()),
        is_internal: t.Optional(t.String()),
      }),
    }
  )

  // POST /api/owner/kb
  .post(
    "/kb",
    createKnowledgeBaseController,
    {
      body: t.Object({
        category: t.String(),
        title: t.String(),
        content: t.String(),
        is_internal: t.Optional(t.Boolean()),
      }),
    }
  )

  // POST /api/owner/kb/batch
  .post(
    "/kb/batch",
    batchCreateKnowledgeBaseController,
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            category: t.String(),
            title: t.String(),
            content: t.String(),
            is_internal: t.Optional(t.Boolean()),
          })
        ),
      }),
    }
  )

  // PUT /api/owner/kb/:id
  .put(
    "/kb/:id",
    updateKnowledgeBaseController,
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        category: t.Optional(t.String()),
        title: t.Optional(t.String()),
        content: t.Optional(t.String()),
        is_internal: t.Optional(t.Boolean()),
      }),
    }
  )

  // DELETE /api/owner/kb/:id
  .delete(
    "/kb/:id",
    deleteKnowledgeBaseController,
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ==========================================
  // 4. Onboarding Sub-Module
  // ==========================================
  // POST /api/owner/onboarding
  .post(
    "/onboarding",
    submitOnboardingController,
    {
      body: t.Object({
        userName: t.Optional(t.String()),
        businessName: t.String(),
        businessType: t.Union([
          t.Literal("kuliner"),
          t.Literal("toko"),
          t.Literal("jasa"),
          t.Literal("lainnya"),
        ]),
        customCategory: t.Optional(t.String()),
        businessDescription: t.Optional(t.String()),
        ownerPhone: t.Optional(t.String()),
        phoneVerified: t.Optional(t.Boolean()),
        connectedBots: t.Optional(
          t.Array(
            t.Object({
              channel: t.Union([t.Literal("whatsapp"), t.Literal("telegram")]),
              externalAccountId: t.String(),
              sessionRef: t.Optional(t.String()),
            })
          )
        ),
        personalization: t.Optional(
          t.Object({
            botName: t.Optional(t.String()),
            assistantBotName: t.Optional(t.String()),
            speakingStyles: t.Optional(t.Array(t.String())),
            customRules: t.Optional(t.Array(t.String())),
            assistantSpeakingStyles: t.Optional(t.Array(t.String())),
            assistantCustomRules: t.Optional(t.Array(t.String())),
            adminPersonaPrompt: t.Optional(t.String()),
            assistantPersonaPrompt: t.Optional(t.String()),
          })
        ),
        knowledgeBase: t.Optional(
          t.Array(
            t.Object({
              category: t.String(),
              title: t.String(),
              content: t.String(),
              is_internal: t.Optional(t.Boolean()),
            })
          )
        ),
      }),
    }
  )

  // GET /api/owner/onboarding-status
  .get("/onboarding-status", getOnboardingStatusController)

  // GET /api/owner/onboarding-detail (Pre-fill Overview UI)
  .get("/onboarding-detail", getOnboardingDetailController);

export const ownerProfileRoutes = ownerRoutes;
