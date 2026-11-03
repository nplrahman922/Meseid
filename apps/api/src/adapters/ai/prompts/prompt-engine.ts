import { readFileSync } from 'fs';
import { join } from 'path';
import type { PromptEngineInput, PromptTemplateVariables } from './prompt.types';

const PROMPTS_DIR = __dirname;
const TEMPLATES_DIR = join(PROMPTS_DIR, 'templates');
const PARTIALS_DIR = join(PROMPTS_DIR, 'partials');

// In-memory cache untuk berkas Markdown
const fileCache = new Map<string, string>();

function readMarkdown(filePath: string): string {
  const cached = fileCache.get(filePath);
  if (cached !== undefined) return cached;
  try {
    const content = readFileSync(filePath, 'utf-8');
    fileCache.set(filePath, content);
    return content;
  } catch {
    return '';
  }
}

/**
 * Dynamic Prompt Engine:
 * Menyusun prompt sistem AI secara dinamis berdasarkan kapasitas model (ModelProfile)
 * dan peran percakapan (Admin Toko vs Asisten Pemilik).
 */
export class PromptEngine {
  static compileSystemPrompt(input: PromptEngineInput): string {
    const { persona, businessContext, modelProfile } = input;
    const isFreeCompact = modelProfile?.tier === 'free' && modelProfile?.promptStyle === 'plain_text_regex';

    // 1. Pilih template dasar (Base Template)
    let baseFile = 'admin-store.system.md';
    if (isFreeCompact) {
      baseFile = 'compact-free.system.md';
    } else if (persona === 'assistant') {
      baseFile = 'assistant-owner.system.md';
    }
    let systemPrompt = readMarkdown(join(TEMPLATES_DIR, baseFile));

    // 2. Tentukan modul partials berdasarkan profil model & persona
    const partials: string[] = [];

    // Partials Keamanan / Hak Akses Peran
    if (!isFreeCompact) {
      if (persona === 'assistant') {
        partials.push(readMarkdown(join(PARTIALS_DIR, 'owner-trust-access.md')));
      } else {
        partials.push(readMarkdown(join(PARTIALS_DIR, 'anti-leak-guard.md')));
      }
    }

    // Partials Stempel Waktu Real-time WIB
    partials.push(readMarkdown(join(PARTIALS_DIR, 'temporal-wib.md')));

    // Partials Format Output (JSON vs Plain Text)
    if (modelProfile?.promptStyle === 'plain_text_regex') {
      partials.push(readMarkdown(join(PARTIALS_DIR, 'plain-text-format.md')));
    } else {
      partials.push(readMarkdown(join(PARTIALS_DIR, 'strict-json-format.md')));
    }

    // Partials Penambahan Konteks Khusus (Few-Shot untuk Model Asing/Qwen)
    if (modelProfile?.requiresFewShot) {
      partials.push(readMarkdown(join(PARTIALS_DIR, 'few-shot-qwen.md')));
    }

    systemPrompt += '\n\n' + partials.filter(Boolean).join('\n\n');

    // 3. Substitusi variabel dinamis
    const nowWib = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    const defaultBotName = persona === 'assistant' ? 'Asisten Bisnis' : 'Admin Toko';
    const vars: PromptTemplateVariables = {
      businessName: businessContext?.businessName || 'Usaha Saya',
      businessType: businessContext?.businessType || 'bisnis',
      botName: businessContext?.botName || defaultBotName,
      customPersonaPrompt: businessContext?.customPersonaPrompt
        ? `INSTRUKSI GAYA KOMUNIKASI USAHA:\n${businessContext.customPersonaPrompt}`
        : '',
      knowledgeBaseContext: businessContext?.knowledgeBaseContext
        ? `BASIS PENGETAHUAN RESMI:\n${businessContext.knowledgeBaseContext}`
        : 'Belum ada data katalog resmi.',
      memoryDigest: businessContext?.memoryDigest
        ? `KONTEKS MEMORI:\n${businessContext.memoryDigest}`
        : '',
      nowWib,
    };

    return systemPrompt
      .replace(/{{businessName}}/g, vars.businessName)
      .replace(/{{businessType}}/g, vars.businessType)
      .replace(/{{botName}}/g, vars.botName)
      .replace(/{{customPersonaPrompt}}/g, vars.customPersonaPrompt)
      .replace(/{{knowledgeBaseContext}}/g, vars.knowledgeBaseContext)
      .replace(/{{memoryDigest}}/g, vars.memoryDigest)
      .replace(/{{nowWib}}/g, vars.nowWib)
      .trim();
  }
}
