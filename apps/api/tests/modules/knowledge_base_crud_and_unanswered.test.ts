import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  listKnowledgeBase,
  createKnowledgeBase,
  batchInsertKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  listUnansweredQuestionsAction,
  resolveUnansweredQuestionAction,
  listKnowledgeBaseController,
  createKnowledgeBaseController,
  batchCreateKnowledgeBaseController,
  updateKnowledgeBaseController,
  deleteKnowledgeBaseController,
  listUnansweredQuestionsController,
  resolveUnansweredQuestionController,
} from "../../src/modules/owner/kb";

describe("Knowledge Base & Unanswered Questions: Unit & Integrity Tests", () => {
  const dummyOwnerId = "11111111-2222-3333-4444-555555555555";

  it("TEST 1: Verifikasi Skema DB & Migrasi: Kolom is_internal dan tabel unanswered_questions", () => {
    const migration018 = resolve(__dirname, "../../src/db/migrations/018_onboarding_enhancements.sql");
    expect(existsSync(migration018)).toBe(true);
    const sql018 = readFileSync(migration018, "utf-8");
    expect(sql018.includes("ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false")).toBe(true);

    const migration014 = resolve(__dirname, "../../src/db/migrations/014_ingestion_chat.sql");
    expect(existsSync(migration014)).toBe(true);
    const sql014 = readFileSync(migration014, "utf-8");
    expect(sql014.includes("CREATE TABLE IF NOT EXISTS unanswered_questions")).toBe(true);
    expect(sql014.includes("question_text text NOT NULL")).toBe(true);
    expect(sql014.includes("times_asked integer NOT NULL DEFAULT 1")).toBe(true);
    expect(sql014.includes("resolved boolean NOT NULL DEFAULT false")).toBe(true);
    expect(sql014.includes("resolved_by_kb_id uuid REFERENCES knowledge_base(id)")).toBe(true);
  });

  it("TEST 2: Verifikasi Zero Production Impact: SQL Actions mutlak memfilter data berdasarkan owner_id", () => {
    const createActionSrc = readFileSync(
      resolve(__dirname, "../../src/modules/owner/kb/actions/create-kb.action.ts"),
      "utf-8"
    );
    expect(createActionSrc.includes("owner_id")).toBe(true);

    const updateActionSrc = readFileSync(
      resolve(__dirname, "../../src/modules/owner/kb/actions/update-kb.action.ts"),
      "utf-8"
    );
    expect(updateActionSrc.includes("owner_id = ${ownerId}")).toBe(true);

    const deleteActionSrc = readFileSync(
      resolve(__dirname, "../../src/modules/owner/kb/actions/delete-kb.action.ts"),
      "utf-8"
    );
    expect(deleteActionSrc.includes("owner_id = ${ownerId}")).toBe(true);

    const resolveActionSrc = readFileSync(
      resolve(__dirname, "../../src/modules/owner/kb/actions/resolve-unanswered-question.action.ts"),
      "utf-8"
    );
    expect(resolveActionSrc.includes("owner_id = ${ownerId}")).toBe(true);
  });

  it("TEST 3: Eksekusi Action & Controller Create dan List Knowledge Base dengan isolasi is_internal", async () => {
    const store: any[] = [];
    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("INSERT INTO knowledge_base")) {
        const item = {
          id: "kb-001",
          owner_id: values[0],
          category: values[1],
          title: values[2],
          content: values[3],
          is_internal: values[4] ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        store.push(item);
        return [item];
      }
      if (query.includes("SELECT") && query.includes("FROM knowledge_base")) {
        return store.filter((s) => s.owner_id === dummyOwnerId);
      }
      return [];
    };

    // 1. Create Public Entry
    const publicItem = await createKnowledgeBase(mockTx, dummyOwnerId, {
      category: "Produk",
      title: "Es Teh Manis",
      content: "Rp 5.000 segar manis",
      is_internal: false,
    });
    expect(publicItem.title).toBe("Es Teh Manis");
    expect(publicItem.is_internal).toBe(false);

    // 2. Create Internal Entry
    const internalItem = await createKnowledgeBase(mockTx, dummyOwnerId, {
      category: "SOP",
      title: "Resep Rahasia Sirup",
      content: "Campuran gula aren 2:1",
      is_internal: true,
    });
    expect(internalItem.title).toBe("Resep Rahasia Sirup");
    expect(internalItem.is_internal).toBe(true);

    // 3. Test List Controller
    const controllerResult: any = await listKnowledgeBaseController({
      query: {},
      owner: { id: dummyOwnerId },
      runOwnerTx: async (fn: any) => fn(mockTx),
    });
    expect(controllerResult.status).toBe("ok");
    expect(controllerResult.items.length).toBe(2);
  });

  it("TEST 4: Eksekusi Batch Create Action & Controller (Simulasi Import CSV)", async () => {
    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      return [
        {
          id: "kb-b1",
          owner_id: dummyOwnerId,
          category: "Menu",
          title: "Kopi Susu",
          content: "Rp 10.000",
          is_internal: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "kb-b2",
          owner_id: dummyOwnerId,
          category: "Keuangan",
          title: "Modal Awal",
          content: "Rahasia",
          is_internal: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    };

    const mockSet = { status: 200 };
    const res: any = await batchCreateKnowledgeBaseController({
      body: {
        items: [
          { category: "Menu", title: "Kopi Susu", content: "Rp 10.000", is_internal: false },
          { category: "Keuangan", title: "Modal Awal", content: "Rahasia", is_internal: true },
        ],
      },
      owner: { id: dummyOwnerId },
      runOwnerTx: async (fn: any) => fn(mockTx),
      set: mockSet,
    });

    expect(res.status).toBe("ok");
    expect(res.items.length).toBe(2);
    expect(mockSet.status).toBe(201);
  });

  it("TEST 5: Eksekusi Update & Delete Knowledge Base", async () => {
    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("UPDATE knowledge_base")) {
        return [
          {
            id: values[values.length - 2],
            owner_id: values[values.length - 1],
            category: "Produk Baru",
            title: "Es Teh Jumbo",
            content: "Rp 7.000",
            is_internal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      if (query.includes("DELETE FROM knowledge_base")) {
        const deletedRows = [{ id: values[0] }];
        Object.assign(deletedRows, { count: 1 });
        return deletedRows;
      }
      return [];
    };

    const updateRes: any = await updateKnowledgeBaseController({
      params: { id: "kb-001" },
      body: { title: "Es Teh Jumbo", category: "Produk Baru", content: "Rp 7.000" },
      owner: { id: dummyOwnerId },
      runOwnerTx: async (fn: any) => fn(mockTx),
      set: {},
    });
    expect(updateRes.status).toBe("ok");
    expect(updateRes.item.title).toBe("Es Teh Jumbo");

    const deleteRes: any = await deleteKnowledgeBaseController({
      params: { id: "kb-001" },
      owner: { id: dummyOwnerId },
      runOwnerTx: async (fn: any) => fn(mockTx),
      set: {},
    });
    expect(deleteRes.status).toBe("ok");
  });

  it("TEST 6: Eksekusi Action & Controller Pertanyaan Belum Terjawab (Unanswered Questions)", async () => {
    let qStatus = false;
    let resolvedBy: string | null = null;

    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("SELECT") && query.includes("FROM unanswered_questions")) {
        return [
          {
            id: "uq-123",
            owner_id: dummyOwnerId,
            question_text: "Apakah ada menu bebas gula?",
            times_asked: 4,
            resolved: qStatus,
            resolved_by_kb_id: resolvedBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      if (query.includes("UPDATE unanswered_questions")) {
        qStatus = true;
        resolvedBy = values[0];
        return [
          {
            id: values[1],
            owner_id: values[2],
            question_text: "Apakah ada menu bebas gula?",
            times_asked: 4,
            resolved: true,
            resolved_by_kb_id: values[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      return [];
    };

    // 1. List Unanswered Questions
    const listRes: any = await listUnansweredQuestionsController({
      owner: { id: dummyOwnerId },
      query: { resolved: "false" },
      runOwnerTx: async (fn: any) => fn(mockTx),
    });
    expect(listRes.status).toBe("ok");
    expect(listRes.questions.length).toBe(1);
    expect(listRes.questions[0].question_text).toBe("Apakah ada menu bebas gula?");
    expect(listRes.questions[0].resolved).toBe(false);

    // 2. Resolve Unanswered Question with KB ID
    const resolveRes: any = await resolveUnansweredQuestionController({
      owner: { id: dummyOwnerId },
      params: { id: "uq-123" },
      body: { resolved_by_kb_id: "kb-001" },
      runOwnerTx: async (fn: any) => fn(mockTx),
      set: {},
    });
    expect(resolveRes.status).toBe("ok");
    expect(resolveRes.question.resolved).toBe(true);
    expect(resolveRes.question.resolved_by_kb_id).toBe("kb-001");
  });

  it("TEST 7: Verifikasi Rute Elysia di owner.ts", () => {
    const ownerRoutesSrc = readFileSync(resolve(__dirname, "../../src/routes/owner.ts"), "utf-8");
    expect(ownerRoutesSrc.includes('.get(\n    "/kb/unanswered"')).toBe(true);
    expect(ownerRoutesSrc.includes('.put(\n    "/kb/unanswered/:id/resolve"')).toBe(true);
    expect(ownerRoutesSrc.includes('.post(\n    "/kb/batch"')).toBe(true);
    expect(ownerRoutesSrc.includes('.delete(\n    "/kb/:id"')).toBe(true);
  });

  it("TEST 8: Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris) pada seluruh berkas", () => {
    const files = [
      "../../src/modules/owner/kb/actions/list-kb.action.ts",
      "../../src/modules/owner/kb/actions/create-kb.action.ts",
      "../../src/modules/owner/kb/actions/batch-insert-kb.action.ts",
      "../../src/modules/owner/kb/actions/update-kb.action.ts",
      "../../src/modules/owner/kb/actions/delete-kb.action.ts",
      "../../src/modules/owner/kb/actions/list-unanswered-questions.action.ts",
      "../../src/modules/owner/kb/actions/resolve-unanswered-question.action.ts",
      "../../src/modules/owner/kb/controllers/list-kb.controller.ts",
      "../../src/modules/owner/kb/controllers/create-kb.controller.ts",
      "../../src/modules/owner/kb/controllers/batch-create-kb.controller.ts",
      "../../src/modules/owner/kb/controllers/update-kb.controller.ts",
      "../../src/modules/owner/kb/controllers/delete-kb.controller.ts",
      "../../src/modules/owner/kb/controllers/list-unanswered-questions.controller.ts",
      "../../src/modules/owner/kb/controllers/resolve-unanswered-question.controller.ts",
      "../../src/routes/owner.ts",
    ];

    for (const rel of files) {
      const fullPath = resolve(__dirname, rel);
      expect(existsSync(fullPath)).toBe(true);
      const content = readFileSync(fullPath, "utf-8");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThan(400);
    }
  });
});
