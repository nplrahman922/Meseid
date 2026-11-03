import { describe, expect, it } from 'bun:test';
import { aiAdapter } from '../../src/adapters/ai';

describe('AI Extraction Suite (10 Indonesian UMKM Transaction Sentences)', () => {
  const testCases = [
    {
      text: 'Beli bensin 25rb buat nganter pesanan',
      expectedType: 'expense',
      expectedAmount: 25000,
    },
    {
      text: 'Beli telur 2kg 56.000 di agen',
      expectedType: 'expense',
      expectedAmount: 56000,
    },
    {
      text: 'Bayar tagihan listrik toko 150rb',
      expectedType: 'expense',
      expectedAmount: 150000,
    },
    {
      text: 'Terima pembayaran katering 1.500.000 via transfer',
      expectedType: 'income',
      expectedAmount: 1500000,
    },
    {
      text: 'Beli kantong plastik 3 pack 45rb',
      expectedType: 'expense',
      expectedAmount: 45000,
    },
    {
      text: 'Penjualan kopi hari ini laku 320.000',
      expectedType: 'income',
      expectedAmount: 320000,
    },
    {
      text: 'Beli galon air 3 biji 54rb',
      expectedType: 'expense',
      expectedAmount: 54000,
    },
    {
      text: 'Bayar uang kebersihan dan iuran pasar 10rb',
      expectedType: 'expense',
      expectedAmount: 10000,
    },
    {
      text: 'Pelanggan bayar utang kemarin 75.000',
      expectedType: 'income',
      expectedAmount: 75000,
    },
    {
      text: 'Beli gas elpiji 3kg 22rb',
      expectedType: 'expense',
      expectedAmount: 22000,
    },
  ];

  it('berhasil memproses dan mengekstrak 10 kalimat transaksi UMKM secara akurat', async () => {
    // Jalankan test sample dengan delay yang aman dari rate limit (5 req/min)
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 12500));
      }
      console.log(`\nTesting [${i + 1}/${testCases.length}]: "${tc.text}"...`);
      const res = await aiAdapter.extractChatResponse(tc.text, 'assistant', {
        businessName: 'Warkop Nusantara',
        businessType: 'kuliner / warkop',
      });

      console.log(`-> Reply  : ${res.reply}`);
      console.log(`-> Intent : ${res.intent}`);
      console.log(`-> Summary: ${res.summary}`);
      console.log(`-> Trans  :`, res.transaction);

      expect(res.schema_valid).toBe(true);
      expect(res.reply).toBeDefined();
      expect(res.intent).toBe(tc.expectedType);
      expect(res.transaction).not.toBeNull();
      expect(res.transaction?.type).toBe(tc.expectedType as any);
      expect(res.transaction?.amount).toBe(tc.expectedAmount);
    }
  }, 240000); // 240 detik timeout untuk 10 kali panggilan AI dengan jeda rate-limit

  it('mengembalikan transaction = null jika pesan bukan transaksi (inquiry)', async () => {
    await new Promise((r) => setTimeout(r, 12500));
    const res = await aiAdapter.extractChatResponse(
      'Halo kak, apakah warkop buka hari ini dan ada menu kopi tubruk?',
      'admin',
      {
        businessName: 'Warkop Nusantara',
        businessType: 'kuliner / warkop',
      }
    );

    expect(res.schema_valid).toBe(true);
    expect(res.transaction).toBeNull();
    expect(res.intent).toBe('inquiry');
  }, 30000);
});
