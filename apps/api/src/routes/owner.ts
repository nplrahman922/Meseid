import { Elysia, t } from "elysia";
import { requireOwner } from "../middleware/auth";
import {
  getOwnerProfileController,
  updateOwnerProfileController,
  deleteOwnerAccountController,
  getPersonalisasiController,
  updatePersonalisasiController,
  getAvailableBotModelsController,
  simulatePersonaChatController,
  listKnowledgeBaseController,
  createKnowledgeBaseController,
  batchCreateKnowledgeBaseController,
  updateKnowledgeBaseController,
  deleteKnowledgeBaseController,
  listUnansweredQuestionsController,
  resolveUnansweredQuestionController,
  submitOnboardingController,
  getOnboardingStatusController,
  getOnboardingDetailController,
  listAccessRulesController,
  upsertAccessRuleController,
  toggleGlobalAccessController,
  analyzeContactBehaviorController,
  getKanalStatusController,
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
        assistant_speaking_styles: t.Optional(t.Array(t.String())),
        assistant_custom_rules: t.Optional(t.Array(t.String())),
        admin_language: t.Optional(t.String()),
        assistant_language: t.Optional(t.String()),
        selected_model_id: t.Optional(t.String()),
        assistant_model_id: t.Optional(t.String()),
        admin_model_id: t.Optional(t.String()),
        customer_access_mode: t.Optional(t.Union([t.Literal("open"), t.Literal("whitelist")])),
        allowed_contacts: t.Optional(t.Any()),
        allowed_groups: t.Optional(t.Any()),
        auto_reply_enabled: t.Optional(t.Boolean()),
        business_hours: t.Optional(t.Any()),
      }),
    }
  )

  // POST /api/owner/personalisasi/simulate
  .post(
    "/personalisasi/simulate",
    simulatePersonaChatController,
    {
      body: t.Object({
        persona: t.Union([t.Literal("assistant"), t.Literal("admin")]),
        message: t.String(),
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

  // GET /api/owner/kb/unanswered
  .get(
    "/kb/unanswered",
    listUnansweredQuestionsController,
    {
      query: t.Object({
        resolved: t.Optional(t.String()),
      }),
    }
  )

  // PUT /api/owner/kb/unanswered/:id/resolve
  .put(
    "/kb/unanswered/:id/resolve",
    resolveUnansweredQuestionController,
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Optional(
        t.Object({
          resolved_by_kb_id: t.Optional(t.String()),
        })
      ),
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
            storeLanguage: t.Optional(t.String()),
            assistantLanguage: t.Optional(t.String()),
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
  .get("/onboarding-detail", getOnboardingDetailController)
  // GET /api/owner/onboarding/detail (Alias URL)
  .get("/onboarding/detail", getOnboardingDetailController)

  // ==========================================
  // 5. Kanal & Access Control Sub-Module
  // ==========================================
  // GET /api/owner/kanal/status
  .get("/kanal/status", getKanalStatusController)

  // GET /api/owner/kanal/access-rules
  .get("/kanal/access-rules", listAccessRulesController)

  // PUT /api/owner/kanal/access-rules
  .put(
    "/kanal/access-rules",
    upsertAccessRuleController,
    {
      body: t.Object({
        channel: t.Union([t.Literal("whatsapp"), t.Literal("telegram")]),
        target_type: t.Union([t.Literal("number"), t.Literal("group")]),
        target_id: t.String(),
        target_name: t.Optional(t.String()),
        custom_label: t.Optional(t.String()),
        status: t.Optional(t.Union([t.Literal("active"), t.Literal("disabled"), t.Literal("blocked")])),
        persona_mode: t.Optional(t.Union([t.Literal("assistant"), t.Literal("admin")])),
        trigger_mode: t.Optional(t.Union([t.Literal("mention_or_reply"), t.Literal("always")])),
      }),
    }
  )

  // PUT /api/owner/kanal/global-access
  .put(
    "/kanal/global-access",
    toggleGlobalAccessController,
    {
      body: t.Object({
        mode: t.Union([t.Literal("open"), t.Literal("whitelist")]),
      }),
    }
  )

  // POST /api/owner/kanal/analyze-behavior
  .post(
    "/kanal/analyze-behavior",
    analyzeContactBehaviorController,
    {
      body: t.Object({
        channel: t.Union([t.Literal("whatsapp"), t.Literal("telegram")]),
        target_id: t.String(),
        target_type: t.Optional(t.Union([t.Literal("number"), t.Literal("group")])),
        model_id: t.Optional(t.String()),
      }),
    }
  );

export const ownerProfileRoutes = ownerRoutes;
