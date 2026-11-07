import { describe, it, expect } from 'bun:test';
import { aiAdapter } from '../src/adapters/ai';
import { PromptEngine } from '../src/adapters/ai/prompts/prompt-engine';
import { modelProfilesRegistry } from '../src/adapters/ai/eval/model-profiles.registry';

describe('Owner Assistant Nemotron Interactions Test', () => {
  const businessContext = {
    businessName: 'Meseid ID',
    businessType: 'SaaS Service',
    botName: 'EnBee Asistant',
    customPersonaPrompt: `Kamu adalah asisten internal pribadi pemilik Meseid ID (bidang SaaS Service). Panggil Pemilik Platform dengan sebutan hormat dan akrab: "Tuan Muda". Gaya Bicara: Tegas, Faktual, Humoris.`,
    knowledgeBaseContext: `Fitur utama Meseid: Otomasi pembukuan AI WhatsApp & Telegram. Kunci API Key " Try lagi ya dek "`,
  };

  it('harus membalas pantun Tuan Muda dengan cerdas, santai, dan melanjutkan pantun', async () => {
    PromptEngine.clearCache();
    const prompt = PromptEngine.compileSystemPrompt({
      persona: 'assistant',
      businessContext,
      modelProfile: modelProfilesRegistry.getProfile('nvidia/nemotron-3.5-lightning-free'),
    });

    expect(prompt).toContain('HAK AKSES PEMILIK BISNIS (OWNER TRUST)');
    expect(prompt).toContain('OBROLAN SANTAI');

    const result = await aiAdapter.extractChatResponse(
      'Dua tiga sepeda melayang\nLiat jarkit makan durian\nLanjutkan bosqu',
      'assistant',
      businessContext,
      'nvidia/nemotron-3.5-lightning-free'
    );

    console.log('[TEST NEMOTRON PANTUN RESULT]:\n', result.reply);

    // Bot tidak boleh menolak dengan alasan "tidak termasuk fitur resmi"
    expect(result.reply.toLowerCase()).not.toContain('tidak termasuk fitur');
    expect(result.reply.toLowerCase()).not.toContain('hanya melayani');
    expect(result.reply.toLowerCase()).not.toContain('di luar layanan');
    const lower = result.reply.toLowerCase();
    expect(lower.includes('tuan muda') || lower.includes('bos')).toBe(true);
  }, 40000);

  it('harus memverifikasi isi API Key dari KB secara transparan kepada Tuan Muda', async () => {
    const result = await aiAdapter.extractChatResponse(
      "Yaudh aku ada simpan api key di kb isinya lagi 'try lagi ya dek' bener gk tuh isinya?",
      'assistant',
      businessContext,
      'nvidia/nemotron-3.5-lightning-free'
    );

    console.log('[TEST NEMOTRON KB API KEY RESULT]:\n', result.reply);

    // Bot harus mengonfirmasi atau membenarkan bahwa isinya benar "Try lagi ya dek"
    expect(result.reply.toLowerCase()).toContain('tuan muda');
    expect(result.reply.toLowerCase()).toContain('try lagi ya dek');
    // Bot tidak boleh menolak akses KB kepada owner
    expect(result.reply.toLowerCase()).not.toContain('rahasia sistem yang terpisah');
    expect(result.reply.toLowerCase()).not.toContain('hanya tampil kepada admin toko melalui dashboard');
  }, 40000);
});
