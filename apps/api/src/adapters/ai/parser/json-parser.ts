import { AiCotCleaner } from '../sanitizer/ai-cot-cleaner';

/**
 * Utilitas Parser dan Sanitizer respon JSON dari AI Model.
 */
export class JsonParser {
  /**
   * Mencoba mem-parse JSON string dengan perbaikan otomatis terhadap raw newline/tab di dalam string literal.
   */
  private static tryParseJsonWithRepairs(str: string): any | null {
    try {
      return JSON.parse(str);
    } catch {
      try {
        let inStr = false;
        let esc = false;
        let result = '';
        for (let i = 0; i < str.length; i++) {
          const c = str[i];
          if (inStr) {
            if (esc) {
              esc = false;
              result += c;
            } else if (c === '\\') {
              esc = true;
              result += c;
            } else if (c === '"') {
              inStr = false;
              result += c;
            } else if (c === '\n') {
              result += '\\n';
            } else if (c === '\r') {
              result += '\\r';
            } else if (c === '\t') {
              result += '\\t';
            } else {
              result += c;
            }
          } else {
            if (c === '"') {
              inStr = true;
            }
            result += c;
          }
        }
        return JSON.parse(result);
      } catch {
        return null;
      }
    }
  }

  /**
   * Mengekstrak dan mem-parse JSON object valid dari teks yang mungkin bercampur dengan narasi atau tag reasoning.
   */
  static parseFirstValidJsonObject(text: string): any | null {
    if (!text) return null;

    let depth = 0;
    let startIndex = -1;
    let inString = false;
    let escape = false;
    const candidates: any[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        if (depth === 0) {
          startIndex = i;
        }
        depth++;
      } else if (char === '}') {
        if (depth > 0) {
          depth--;
          if (depth === 0 && startIndex !== -1) {
            const candidateStr = text.substring(startIndex, i + 1);
            const parsed = this.tryParseJsonWithRepairs(candidateStr);
            if (
              typeof parsed === 'object' &&
              parsed !== null &&
              (
                (typeof parsed.reply === 'string' && typeof parsed.intent === 'string') ||
                typeof parsed.is_valid === 'boolean'
              )
            ) {
              candidates.push(parsed);
            }
          }
        }
      }
    }

    if (candidates.length > 0) {
      const realCandidates = candidates.filter(
        (c) =>
          !c.reply ||
          (!c.reply.includes('Tulis balasan langsung') &&
            !c.reply.includes('Tulis balasan'))
      );
      if (realCandidates.length > 0) {
        return realCandidates[realCandidates.length - 1];
      }
      // Jika semua kandidat adalah template contoh prompt, tolak agar diekstraksi lewat fallback
      return null;
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return this.tryParseJsonWithRepairs(text.substring(firstBrace, lastBrace + 1));
    }

    return null;
  }

  /**
   * Mengekstrak teks balasan bersih dari string respons LLM yang rusak atau terpotong
   */
  static sanitizeRawAiReply(rawContent: string): string {
    if (!rawContent || !rawContent.trim()) {
      return 'Halo! Ada yang bisa kami bantu?';
    }

    let text = rawContent.trim();
    // Hanya bersihkan pembungkus blok markdown JSON terluar (```json ... ```) dari respons mentah LLM
    if (/^```(?:json)?\s*/i.test(text)) {
      text = text.replace(/^```(?:json)?\s*/i, '');
      text = text.replace(/\s*```$/i, '').trim();
    }

    const replyMatches = [...text.matchAll(/"reply"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"[a-zA-Z0-9_-]+"\s*:|"\s*})/gi)];
    if (replyMatches.length > 0) {
      const validMatches = replyMatches.filter(
        (m) => {
          const t = m[1].trim();
          return (
            t.length > 3 &&
            t !== '...' &&
            t !== '…' &&
            !t.includes('Tulis balasan langsung') &&
            !t.includes('Tulis balasan')
          );
        }
      );
      if (validMatches.length > 0) {
        const chosen = validMatches.reduce(
          (max, cur) => (cur[1].length > max[1].length ? cur : max),
          validMatches[validMatches.length - 1]
        );
        let extracted = chosen[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\t/g, '\t')
          .trim();
        if (extracted.length > 3 && extracted !== '...' && extracted !== '…') {
          return extracted;
        }
      }
    }

    // Fallback ekstraksi dari posisi "reply": " terakhir jika teks terpotong
    const replyRegex = /"reply"\s*:\s*"/gi;
    let match;
    let lastReplyIndex = -1;
    while ((match = replyRegex.exec(text)) !== null) {
      lastReplyIndex = replyRegex.lastIndex;
    }

    if (lastReplyIndex !== -1) {
      let tail = text.slice(lastReplyIndex);
      tail = tail.replace(/"\s*,\s*"[a-zA-Z0-9_-]+"\s*:[\s\S]*$/, '');
      tail = tail.replace(/"\s*}\s*(?:```)?\s*$/, '');
      tail = tail.replace(/\s*```\s*$/, '');
      tail = tail
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\t/g, '\t')
        .trim();

      if (tail.length > 3 && tail !== '...' && tail !== '…' && !tail.includes('Tulis balasan langsung')) {
        return tail;
      }
    }

    const replyMatch = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/i);
    if (replyMatch && replyMatch[1]) {
      let extracted = replyMatch[1];
      extracted = extracted
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\t/g, '\t');
      text = extracted.trim();
    } else if (text.startsWith('{')) {
      text = text
        .replace(/^{\s*"[a-zA-Z0-9_-]+"\s*:\s*"?/g, '')
        .replace(/[}"]+$/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .trim();
    }

    if (!text || text === '...' || text === '…' || text.length < 3) {
      return 'Halo! Ada yang bisa kami bantu?';
    }

    return AiCotCleaner.cleanThinkingArtifacts(text);
  }
}
