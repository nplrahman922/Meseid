import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  recordUnansweredQuestionAction,
  listUnansweredQuestionsAction,
} from "../../src/modules/owner/kb";
import { DiscussionOrchestrator } from "../../src/modules/chat/pipeline/discussion-orchestrator";

describe("Unanswered Questions Ingestion & AI Guard Lifecycle Tests", () => {
  const dummyOwnerId = "11111111-2222-3333-4444-555555555555";

  it("TEST 1: Verifikasi Migration 027: Kolom channel & rejection_reason", () => {
    const migrationPath = resolve(
      __dirname,
      "../../src/db/migrations/027_enhance_unanswered_questions.sql"
    );
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql.includes("ALTER TABLE unanswered_questions")).toBe(true);
    expect(sql.includes("ADD COLUMN IF NOT EXISTS channel text")).toBe(true);
    expect(sql.includes("ADD COLUMN IF NOT EXISTS rejection_reason text")).toBe(true);
    expect(sql.includes("idx_unanswered_questions_owner_resolved")).toBe(true);
  });

  it("TEST 2: Action recordUnansweredQuestionAction memasukkan entri baru dengan times_asked = 1", async () => {
    let insertedRow: any = null;
    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("SELECT id, times_asked")) {
        return []; // Belum ada data sebelumnya
      }
      if (query.includes("INSERT INTO unanswered_questions")) {
        insertedRow = {
          id: "uq-001",
          owner_id: values[0],
          question_text: values[1],
          times_asked: 1,
          resolved: false,
          channel: values[2],
          rejection_reason: values[3],
        };
        return [insertedRow];
      }
      return [];
    };

    await recordUnansweredQuestionAction(
      mockTx,
      dummyOwnerId,
      "Bisa bayar pakai crypto?",
      { channel: "whatsapp", reason: "missing_kb" }
    );

    expect(insertedRow).not.toBeNull();
    expect(insertedRow.owner_id).toBe(dummyOwnerId);
    expect(insertedRow.question_text).toBe("Bisa bayar pakai crypto?");
    expect(insertedRow.times_asked).toBe(1);
    expect(insertedRow.resolved).toBe(false);
    expect(insertedRow.channel).toBe("whatsapp");
    expect(insertedRow.rejection_reason).toBe("missing_kb");
  });

  it("TEST 3: Action recordUnansweredQuestionAction melakukan deduplikasi dan menaikkan times_asked", async () => {
    let currentTimesAsked = 1;
    let updatedReason = "";
    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("SELECT id, times_asked")) {
        return [{ id: "uq-001", times_asked: currentTimesAsked }];
      }
      if (query.includes("UPDATE unanswered_questions")) {
        currentTimesAsked++;
        updatedReason = values[0];
        return [{ id: values[values.length - 1] }];
      }
      return [];
    };

    await recordUnansweredQuestionAction(
      mockTx,
      dummyOwnerId,
      "Bisa bayar pakai crypto?",
      { channel: "whatsapp", reason: "missing_kb" }
    );

    expect(currentTimesAsked).toBe(2);
    expect(updatedReason).toBe("missing_kb");
  });

  it("TEST 4: Normalisasi teks (trim & case-insensitive) pada pencatatan", async () => {
    let queriedText = "";
    const mockTx: any = (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("SELECT id, times_asked")) {
        queriedText = values[1];
        return [{ id: "uq-001", times_asked: 2 }];
      }
      if (query.includes("UPDATE unanswered_questions")) {
        return [{ id: "uq-001" }];
      }
      return [];
    };

    await recordUnansweredQuestionAction(
      mockTx,
      dummyOwnerId,
      "   Bisa Bayar Pakai Crypto?   ",
      { channel: "whatsapp", reason: "missing_kb" }
    );

    expect(queriedText).toBe("Bisa Bayar Pakai Crypto?");
  });

  it("TEST 5: Action listUnansweredQuestionsAction menyertakan channel dan rejection_reason", async () => {
    const mockTx: any = (strings: TemplateStringsArray) => {
      const query = strings.join("?");
      if (query.includes("SELECT") && query.includes("FROM unanswered_questions")) {
        return [
          {
            id: "uq-001",
            owner_id: dummyOwnerId,
            question_text: "Berapa modal kulakan?",
            times_asked: 5,
            resolved: false,
            resolved_by_kb_id: null,
            channel: "whatsapp",
            rejection_reason: "leakage",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];
      }
      return [];
    };

    const results = await listUnansweredQuestionsAction(mockTx, dummyOwnerId);
    expect(results.length).toBe(1);
    expect(results[0].channel).toBe("whatsapp");
    expect(results[0].rejection_reason).toBe("leakage");
  });

  it("TEST 6: Verifikasi integrasi DiscussionOrchestrator memiliki hook pencatatan Fase 2 & Fase 4", () => {
    const orchestratorSrc = readFileSync(
      resolve(__dirname, "../../src/modules/chat/pipeline/discussion-orchestrator.ts"),
      "utf-8"
    );

    // Verifikasi Fase 2 Hook
    expect(orchestratorSrc.includes("PEREKAMAN FASE 2: Penolakan Instan Keamanan")).toBe(true);
    expect(orchestratorSrc.includes("this.recordUnansweredSafely")).toBe(true);

    // Verifikasi Fase 4 Hook
    expect(orchestratorSrc.includes("PEREKAMAN FASE 4: Kegagalan Putaran 2")).toBe(true);
    expect(orchestratorSrc.includes('reason: RejectionReason')).toBe(true);
  });

  it("TEST 7: Verifikasi Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris)", () => {
    const files = [
      "../../src/modules/owner/kb/actions/record-unanswered-question.action.ts",
      "../../src/modules/owner/kb/actions/list-unanswered-questions.action.ts",
      "../../src/modules/owner/kb/kb.model.ts",
      "../../src/modules/chat/pipeline/discussion-orchestrator.ts",
      "../../src/modules/chat/chat.service.ts",
      "../../../web/src/panels/users/knowledge-base/knowledge-base.types.ts",
      "../../../web/src/panels/users/knowledge-base/components/UnansweredQuestionsCard.svelte",
    ];

    for (const rel of files) {
      const fullPath = resolve(__dirname, rel);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf-8");
        const lineCount = content.split("\n").length;
        expect(lineCount).toBeLessThan(400);
      }
    }
  });
});
