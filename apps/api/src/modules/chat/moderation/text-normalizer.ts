/**
 * Normalizer Teks Anti-Akal-Akalan (Anti-Leetspeak & Anti-Spacing)
 */

const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "^": "a",
  "3": "e",
  "€": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
};

export class TextNormalizer {
  /**
   * Menormalisasi teks mentah menjadi format bersih terstandarisasi untuk dicocokkan dengan kamus.
   */
  static normalize(raw: string): string {
    if (!raw) return "";

    let text = raw.toLowerCase();

    // 1. Substitusi leetspeak
    for (const [leet, char] of Object.entries(LEET_MAP)) {
      text = text.replaceAll(leet, char);
    }

    // 2. Rapatkan deretan huruf tunggal berjarak spasi/titik/simbol (contoh: "s l o t" -> "slot", "g a c o r" -> "gacor")
    text = text.replace(/\b([a-z0-9](?:[\s._\-]+[a-z0-9])+)\b/gi, (match) => {
      const letters = match.split(/[\s._\-]+/).filter(Boolean);
      if (letters.every((l) => l.length === 1)) {
        return letters.join("");
      }
      return match;
    });

    // 3. Reduksi pengulangan huruf berlebih (contoh: "anjiiing" -> "anjing", "gaccooor" -> "gacor")
    text = text.replace(/([a-z])\1{2,}/g, "$1");

    return text;
  }
}
