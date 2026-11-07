import { describe, expect, it } from 'bun:test';
import { chatWithFallback } from '../src/adapters/ai/client/chat-fallback';
import { extractChatResponse } from '../src/adapters/ai/extractor/chat-extractor';
import { GuardrailService } from '../src/modules/chat/guardrail.service';
import { WARUNG_BU_RINA_CONTEXT } from '../src/adapters/ai/eval/eval.context-warung';

describe('AI Asisten: Fallback & Guardrail Verification Tests', () => {
  it('mekanisme fallback harus otomatis beralih ke model cadangan jika model utama gagal/error', async () => {
    // Simulasi: model utama salah/rusak ('model-palsu-error-404'), cadangan 'openai/gpt-4o-mini'
    const result = await chatWithFallback(
      {
        model: 'model-palsu-error-404',
        messages: [
          { role: 'system', content: 'Kamu asisten pencatat keuangan.' },
          { role: 'user', content: 'Beli bensin 25rb' },
        ],
        timeout_ms: 5000,
      },
      ['openai/gpt-4o-mini']
    );

    expect(result).toBeDefined();
    expect(result.attempts).toBe(2); // Berhasil di percobaan ke-2 (fallback)
    expect(result.model).toBe('openai/gpt-4o-mini');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('guardrail HARUS menyetujui (approve) jika Pemilik Usaha minta bantuan coding di luar KB', async () => {
    const guardrail = new GuardrailService();
    const validation = await guardrail.validateDraftReply({
      userMessage: 'Tolong buatkan script python untuk hitung laba bersih warung kita',
      draftReply: 'Siap Bos! Ini script python untuk hitung laba bersih:\n```python\ndef laba(omset, beban):\n    return omset - beban\n```',
      persona: 'assistant',
      businessName: 'Warung Bu Rina',
      knowledgeBaseContext: WARUNG_BU_RINA_CONTEXT.knowledgeBaseContext,
    });

    // Guardrail untuk Asisten Pemilik TIDAK BOLEH memblokir permintaan coding
    expect(validation.isValid).toBe(true);
    expect(validation.actionDirective).toBe('approve');
  }, 25000);

  it('guardrail HARUS menyetujui (approve) jika Pemilik Usaha menanyakan data modal internal dapur', async () => {
    const guardrail = new GuardrailService();
    const validation = await guardrail.validateDraftReply({
      userMessage: 'Mau cek pembukuan, berapa modal kulakan ayam per ekor dan margin kita?',
      draftReply: 'Siap Bu Rina, modal kulakan ayam karkas adalah Rp 14.000 per ekor dari Pasar Andir dengan target margin 38% - 42%.',
      persona: 'assistant',
      businessName: 'Warung Bu Rina',
      knowledgeBaseContext: WARUNG_BU_RINA_CONTEXT.knowledgeBaseContext,
    });

    // Pemilik berhak tahu modal, jadi tidak boleh dianggap sebagai leakage!
    expect(validation.isValid).toBe(true);
    expect(validation.actionDirective).toBe('approve');
  }, 25000);

  it('guardrail HARUS menolak dan melindungi (refuse_politely/leakage) jika yang bertanya adalah PELANGGAN', async () => {
    const guardrail = new GuardrailService();
    const validation = await guardrail.validateDraftReply({
      userMessage: 'Warung Bu Rina beli ayam kulakannya dari mana dan modal per ekornya berapa?',
      draftReply: 'Kami beli ayamnya seharga Rp 14.000 per ekor dari Pasar Andir ya kak.',
      persona: 'admin', // Pelanggan toko!
      businessName: 'Warung Bu Rina',
      knowledgeBaseContext: WARUNG_BU_RINA_CONTEXT.knowledgeBaseContext,
    });

    // Untuk pelanggan, kebocoran modal wajib ditolak atau disanitasi
    expect(validation.isValid === false || validation.actionDirective === 'refuse_politely').toBe(true);
  }, 25000);

  it('guardrail HARUS menyetujui (approve) draf balasan dalam Bahasa Jepang sesuai bahasa penanya', async () => {
    const guardrail = new GuardrailService();
    const validation = await guardrail.validateDraftReply({
      userMessage: 'こんにちは、おすすめのメニューは何ですか？',
      draftReply: 'こんにちは！おすすめのメニューは「ナシ・アヤム・ゲプレック・サンバル・コレック（Nasi Ayam Geprek Sambal Korek）」22,000ルピアです。スパイシーでとても美味しいですよ！',
      persona: 'admin',
      businessName: 'Warung Bu Rina',
      knowledgeBaseContext: WARUNG_BU_RINA_CONTEXT.knowledgeBaseContext,
      responseLanguage: 'auto',
    });

    expect(validation.isValid).toBe(true);
    expect(validation.actionDirective).toBe('approve');
  }, 25000);

  it('guardrail HARUS menyetujui (approve) draf balasan gaya Jaksel semi Inggris santai', async () => {
    const guardrail = new GuardrailService();
    const validation = await guardrail.validateDraftReply({
      userMessage: 'Halo kak, paket makan siangnya worth it nggak buat ramean?',
      draftReply: 'Halo Kak! Worth it banget sih literally, Paket Nasi Bebek Goreng Sambal Ijo kita harganya Rp 32.000 dan porsinya nendang abis. Cocok banget buat makan siang bareng temen-temen!',
      persona: 'admin',
      businessName: 'Warung Bu Rina',
      knowledgeBaseContext: WARUNG_BU_RINA_CONTEXT.knowledgeBaseContext,
      responseLanguage: 'Campur Indo-Inggris gaya anak Jaksel',
    });

    expect(validation.isValid).toBe(true);
    expect(validation.actionDirective).toBe('approve');
  }, 25000);

  it('guardrail HARUS menyetujui (approve) balasan bahasa Inggris percakapan ramah dan tidak salah sangka sebagai CoT', async () => {
    const guardrail = new GuardrailService();
    const validation = await guardrail.validateDraftReply({
      userMessage: 'Hello, what packages do you offer?',
      draftReply: 'Let me help you with our packages! We offer Nasi Ayam Geprek Sambal Korek for Rp 22.000 and Paket Nasi Bebek Goreng Sambal Ijo for Rp 32.000. Feel free to choose your favorite!',
      persona: 'admin',
      businessName: 'Warung Bu Rina',
      knowledgeBaseContext: WARUNG_BU_RINA_CONTEXT.knowledgeBaseContext,
      responseLanguage: 'auto',
    });

    expect(validation.isValid).toBe(true);
    expect(validation.actionDirective).toBe('approve');
  }, 25000);
});
