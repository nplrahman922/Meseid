/**
 * Ekstraktor gaya bicara (speaking styles) dan aturan khusus (custom rules)
 * dari prompt terkompilasi persona bot.
 */
export function extractStyleAndRules(prompt?: string | null): {
  styles: string[];
  rules: string[];
} {
  if (!prompt) return { styles: [], rules: [] };
  const styleMatch = prompt.match(/Gaya Bicara:\s*(.+?)(?:\.\s*Aturan Khusus:|\.$|$)/i);
  const rulesMatch = prompt.match(/Aturan Khusus:\s*([\s\S]+)$/i);
  const styles =
    styleMatch && styleMatch[1]
      ? styleMatch[1].split(",").map((s) => s.trim().replace(/\.$/, "")).filter(Boolean)
      : [];
  const rules =
    rulesMatch && rulesMatch[1]
      ? rulesMatch[1]
          .split(";")
          .map((r) => r.trim().replace(/\.+$/, "").trim())
          .filter(Boolean)
      : [];
  return { styles, rules };
}
