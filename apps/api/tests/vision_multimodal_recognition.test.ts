import { describe, it, expect } from 'bun:test';
import { PromptEngine } from '../src/adapters/ai/prompts/prompt-engine';
import { modelProfilesRegistry } from '../src/adapters/ai/eval/model-profiles.registry';

describe('Vision Multimodal AI Recognition & System Prompt Suite', () => {
  it('Prompt Asisten Pemilik wajib menyertakan instruksi VLM untuk mengidentifikasi objek foto', () => {
    PromptEngine.clearCache();
    const gpt4oProfile = modelProfilesRegistry.getProfile('openai/gpt-4o');

    const prompt = PromptEngine.compileSystemPrompt({
      persona: 'assistant',
      businessContext: {
        businessName: 'Toko Elektronik Makmur',
        businessType: 'Retail Gadget',
        botName: 'Jarvis',
        customPersonaPrompt: 'Panggil saya Raja Sang Maharaja',
      },
      modelProfile: gpt4oProfile,
    });

    // Verifikasi personalisasi dan sapaan kustom tetap dihormati
    expect(prompt).toContain('Panggil saya Raja Sang Maharaja');
    expect(prompt).toContain('Toko Elektronik Makmur');
    expect(prompt).toContain('Jarvis');

    // Verifikasi arahan eksplisit Vision VLM
    expect(prompt).toContain('INPUT PENGLIHATAN FOTO & GAMBAR (VISION VLM)');
    expect(prompt).toContain('keyboard, mouse, monitor');
    expect(prompt).toContain('kamu WAJIB melihat, mengenali, mengidentifikasi, dan mendeskripsikan isi objek dalam gambar');
    expect(prompt).toContain('DILARANG KERAS menolak pesan gambar dari Pemilik');
  });

  it('Template Auditor Guardrail wajib melindungi deskripsi visual objek untuk Pemilik Usaha', () => {
    const auditorTemplate = PromptEngine.loadTemplate('guardrail-auditor.system.md', {
      businessName: 'Toko Elektronik Makmur',
      recipientRole: 'PEMILIK USAHA/OWNER',
      knowledgeBaseContext: 'Tidak ada',
      languageDirective: 'Bahasa Indonesia',
    });

    expect(auditorTemplate).toContain('Jika Pemilik Usaha mengirimkan foto/gambar atau bertanya mengenai objek visual');
    expect(auditorTemplate).toContain('keyboard, perangkat keras, barang dagangan, dokumen');
    expect(auditorTemplate).toContain('100% SAH dan WAJIB DISETUJUI (is_valid = true, action_directive = "approve")');
  });
});
