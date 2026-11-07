import { describe, it, expect } from 'bun:test';
import { PromptEngine } from '../src/adapters/ai/prompts/prompt-engine';
import { modelProfilesRegistry } from '../src/adapters/ai/eval/model-profiles.registry';

describe('Dynamic Prompt Engine & Context Adaptation Tests', () => {
  it('harus melakukan context pruning (pemangkasan) untuk model gratis kecil', () => {
    const nemotronProfile = modelProfilesRegistry.getProfile('nvidia/nemotron-3.5-lightning-free');
    expect(nemotronProfile.promptStyle).toBe('plain_text_regex');

    const prompt = PromptEngine.compileSystemPrompt({
      persona: 'admin',
      businessContext: {
        businessName: 'Toko Sumber Rejeki',
        businessType: 'Sembako',
        botName: 'Siti',
        knowledgeBaseContext: 'Beras Ramos Rp 14.000/kg',
      },
      modelProfile: nemotronProfile,
    });

    // Harus berisi informasi dasar dan teks santun
    expect(prompt).toContain('Toko Sumber Rejeki');
    expect(prompt).toContain('Siti');
    expect(prompt).toContain('Beras Ramos Rp 14.000/kg');
    expect(prompt).toContain('INSTRUKSI FORMAT OUTPUT (TEKS PERCAKAPAN LANGSUNG)');

    // Konteks dipangkas: DILARANG berisi skema JSON multi-tasking yang bikin halusinasi
    expect(prompt).not.toContain('"intent": "expense | income');
    expect(prompt).not.toContain('"transactions": [');
  });

  it('harus melakukan context augmentation (penambahan few-shot) untuk model yang membutuhkan', () => {
    const qwenProfile = modelProfilesRegistry.getProfile('alibaba/qwen3-vl-instruct');
    expect(qwenProfile.requiresFewShot).toBe(true);

    const prompt = PromptEngine.compileSystemPrompt({
      persona: 'admin',
      businessContext: {
        businessName: 'Butik Cantik',
        businessType: 'Fashion',
      },
      modelProfile: qwenProfile,
    });

    // Harus disisipkan contoh konkret few-shot
    expect(prompt).toContain('CONTOH FORMAT OUTPUT RESMI (WAJIB DIIKUTI)');
    expect(prompt).toContain('Contoh 1 (Tanya Info Produk)');
    expect(prompt).toContain('{"reply": "Halo kak! Menu Nasi Ayam Geprek');
  });

  it('harus menyusun konteks penuh untuk model frontier Pro (Gemini / GPT-4o)', () => {
    const geminiProfile = modelProfilesRegistry.getProfile('google/gemini-2.5-flash');

    const prompt = PromptEngine.compileSystemPrompt({
      persona: 'assistant',
      businessContext: {
        businessName: 'CV Maju Lancar',
        businessType: 'Konveksi',
        botName: 'Jarvis',
      },
      modelProfile: geminiProfile,
    });

    // Berisi peran asisten pemilik, stempel waktu WIB, skema JSON, dan izin akses internal
    expect(prompt).toContain('asisten internal pribadi dan mitra kerja cerdas untuk PEMILIK USAHA');
    expect(prompt).toContain('CV Maju Lancar');
    expect(prompt).toContain('Jarvis');
    expect(prompt).toContain('WAKTU SISTEM SAAT INI (WIB)');
    expect(prompt).toContain('HAK AKSES PEMILIK BISNIS (OWNER TRUST)');
    expect(prompt).toContain('SATU OBJEK JSON MURNI');
    expect(prompt).toContain('ATURAN MEMBALAS PESAN (REPLY / QUOTE)');
    expect(prompt).toContain('ATURAN FORMAT & TIPOGRAFI BALASAN');
  });

  it('harus tetap memberikan akses penuh Asisten Pemilik (Owner Trust) meskipun menggunakan model Free Tier', () => {
    PromptEngine.clearCache();
    const nemotronProfile = modelProfilesRegistry.getProfile('nvidia/nemotron-3.5-lightning-free');

    const prompt = PromptEngine.compileSystemPrompt({
      persona: 'assistant',
      businessContext: {
        businessName: 'Meseid ID',
        businessType: 'SaaS Service',
        botName: 'EnBee Asistant',
        customPersonaPrompt: 'Panggil Pemilik Platform dengan sebutan hormat: "Tuan Muda".',
        knowledgeBaseContext: 'Kunci API Key: Try lagi ya dek',
      },
      modelProfile: nemotronProfile,
    });

    // Wajib menggunakan template Asisten Pemilik, BUKAN compact-free (toko)
    expect(prompt).toContain('asisten internal pribadi dan mitra kerja cerdas untuk PEMILIK USAHA');
    expect(prompt).toContain('EnBee Asistant');
    expect(prompt).toContain('Tuan Muda');
    expect(prompt).toContain('HAK AKSES PEMILIK BISNIS (OWNER TRUST)');
    expect(prompt).toContain('Kunci API Key: Try lagi ya dek');

    // Wajib memberikan izin pantun, obrolan santai, dan fleksibilitas
    expect(prompt).toContain('OBROLAN SANTAI');
    expect(prompt).toContain('JANGAN PERNAH menolak obrolan santai atau pantun');

    // DILARANG mengandung aturan pembatasan toko compact-free atau anti-leak-guard yang kaku
    expect(prompt).not.toContain('Jika ada yang ditanyakan di luar info toko, katakan maaf belum tersedia');
    expect(prompt).not.toContain('BATASAN KEAMANAN & ANTI-KEBOCORAN DATA');
  });
});
