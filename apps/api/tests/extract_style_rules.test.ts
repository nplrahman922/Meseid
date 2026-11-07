import { describe, it, expect } from "bun:test";

describe("Extract Style and Rules Regex Test", () => {
  const extractStyleAndRules = (prompt?: string | null) => {
    if (!prompt) return { styles: [], rules: [] };
    const styleMatch = prompt.match(/Gaya Bicara:\s*(.+?)(?:\.\s*Aturan Khusus:|\.$|$)/i);
    const rulesMatch = prompt.match(/Aturan Khusus:\s*([\s\S]+)$/i);
    const styles = styleMatch && styleMatch[1]
      ? styleMatch[1].split(",").map((s) => s.trim().replace(/\.$/, "")).filter(Boolean)
      : [];
    const rules = rulesMatch && rulesMatch[1]
      ? rulesMatch[1]
          .split(";")
          .map((r) => r.trim().replace(/\.+$/, "").trim())
          .filter(Boolean)
      : [];
    return { styles, rules };
  };

  it("harus mengekstrak gaya bicara dan semua aturan khusus dengan benar meskipun ada angka dan titik", () => {
    const prompt = `Kamu adalah asisten internal pribadi pemilik Meseid ID (bidang SaaS Service). Deskripsi usaha: "Meseid adalah platform asisten bisnis AI di WhatsApp dan Telegram untuk UMKM...". Bertanggung jawab atas pencatatan keuangan... Gaya Bicara: Tegas, Faktual, Humoris. Aturan Khusus: 1. Panggil Pemilik Platform dengan sebutan hormat dan akrab: "Tuan Muda"; 2. Sajikan ringkasan data, laporan operasional, dan performa pengguna secara ringkas, berbasis angka dan poin-poin jelas.; 3. Selalu pantau dan ingatkan kuota token AI harian serta status koneksi kanal WhatsApp/Telegram jika terdeteksi kendala.; 4. Bersikap proaktif memberikan saran efisiensi operasional platform dan pengelolaan pengguna..`;

    const result = extractStyleAndRules(prompt);
    expect(result.styles).toEqual(["Tegas", "Faktual", "Humoris"]);
    expect(result.rules.length).toBe(4);
    expect(result.rules[0]).toBe('1. Panggil Pemilik Platform dengan sebutan hormat dan akrab: "Tuan Muda"');
    expect(result.rules[1]).toBe("2. Sajikan ringkasan data, laporan operasional, dan performa pengguna secara ringkas, berbasis angka dan poin-poin jelas");
    expect(result.rules[2]).toBe("3. Selalu pantau dan ingatkan kuota token AI harian serta status koneksi kanal WhatsApp/Telegram jika terdeteksi kendala");
    expect(result.rules[3]).toBe("4. Bersikap proaktif memberikan saran efisiensi operasional platform dan pengelolaan pengguna");
  });

  it("harus menangani prompt yang hanya memiliki gaya bicara tanpa aturan khusus", () => {
    const prompt = `Kamu adalah asisten admin ramah Toko Kue. Melayani pesanan. Gaya Bicara: Ramah, Ceria, Sopan.`;
    const result = extractStyleAndRules(prompt);
    expect(result.styles).toEqual(["Ramah", "Ceria", "Sopan"]);
    expect(result.rules).toEqual([]);
  });

  it("harus menangani prompt yang hanya memiliki aturan khusus tanpa gaya bicara", () => {
    const prompt = `Kamu adalah asisten admin ramah Toko Kue. Melayani pesanan. Aturan Khusus: Jangan beri diskon lebih dari 10%; Selalu ucapkan terima kasih.`;
    const result = extractStyleAndRules(prompt);
    expect(result.styles).toEqual([]);
    expect(result.rules).toEqual([
      "Jangan beri diskon lebih dari 10%",
      "Selalu ucapkan terima kasih",
    ]);
  });
});
