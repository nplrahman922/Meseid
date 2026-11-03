import { PersonaCompilerInput } from "../personalisasi.types";

/**
 * Menyusun gaya bicara, aturan khusus, dan identitas bisnis menjadi prompt terstruktur
 * untuk bot admin pelanggan maupun bot asisten bisnis internal.
 */
export function compilePersonaPrompt(input: PersonaCompilerInput): {
  adminPersonaPrompt: string;
  assistantPersonaPrompt: string;
} {
  const businessName = input.businessName?.trim() || "Bisnis Kami";
  const categoryDesc = (input.customCategory?.trim() || input.businessType || "usaha").trim();
  const descPart = input.businessDescription?.trim()
    ? ` Deskripsi usaha: ${input.businessDescription.trim()}.`
    : "";

  const stylePart =
    input.speakingStyles && input.speakingStyles.length > 0
      ? ` Gaya Bicara: ${input.speakingStyles.map((s) => s.trim()).filter(Boolean).join(", ")}.`
      : "";

  const rulesPart =
    input.customRules && input.customRules.length > 0
      ? ` Aturan Khusus: ${input.customRules.map((r) => r.trim()).filter(Boolean).join("; ")}.`
      : "";

  const adminPersonaPrompt = `Kamu adalah asisten admin ramah ${businessName} (bidang ${categoryDesc}).${descPart} Melayani pertanyaan dan pesanan pelanggan dengan responsif.${stylePart}${rulesPart}`.trim();

  const assistantStylePart =
    input.assistantSpeakingStyles && input.assistantSpeakingStyles.length > 0
      ? ` Gaya Bicara: ${input.assistantSpeakingStyles.map((s) => s.trim()).filter(Boolean).join(", ")}.`
      : stylePart;

  const assistantRulesPart =
    input.assistantCustomRules && input.assistantCustomRules.length > 0
      ? ` Aturan Khusus: ${input.assistantCustomRules.map((r) => r.trim()).filter(Boolean).join("; ")}.`
      : rulesPart;

  const assistantPersonaPrompt = `Kamu adalah asisten internal pribadi pemilik ${businessName} (bidang ${categoryDesc}).${descPart} Bertanggung jawab atas pencatatan keuangan, ringkasan operasional, dan membantu pengambilan keputusan bisnis.${assistantStylePart}${assistantRulesPart}`.trim();

  return {
    adminPersonaPrompt,
    assistantPersonaPrompt,
  };
}
