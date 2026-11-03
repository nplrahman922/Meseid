import { aiAdapter } from '../src/adapters/ai';

async function main() {
  console.log('🤖 ======================================================');
  console.log('   Meseid AI Adapter Test (Vercel AI Gateway)');
  console.log('======================================================\n');

  // 1. Ambil daftar model gratis
  console.log('🔍 Memuat daftar model gratis dari Vercel AI Gateway...');
  const freeModels = await aiAdapter.getFreeModels();

  console.log(`\n📋 Ditemukan ${freeModels.length} Model Gratis:`);
  console.table(
    freeModels.map((m) => ({
      ID: m.id,
      Nama: m.name,
      'Context Window': `${m.context_window.toLocaleString()} tokens`,
      Owner: m.owned_by,
    }))
  );

  // 2. Jalankan test generation ke model gratis default
  console.log('\n💬 Menjalankan tes chat completion ke model gratis default...');
  const prompt = 'Halo! Tolong berikan 3 tips singkat pembukuan kas harian untuk pedagang warung UMKM.';
  console.log(`Prompt: "${prompt}"\n`);

  const result = await aiAdapter.testFreeModel(prompt);

  if (result.success) {
    console.log('✅ Status: BERHASIL');
    console.log(`Model   : ${result.model}`);
    console.log(`Latency : ${result.latency_ms} ms`);
    console.log(`Tokens  : ${result.usage?.total_tokens} (Prompt: ${result.usage?.prompt_tokens}, Reply: ${result.usage?.completion_tokens})`);
    console.log(`Cost    : $${result.usage?.cost}\n`);
    console.log('--- Jawaban AI ---');
    console.log(result.reply);
    console.log('------------------');
  } else {
    console.error('❌ Status: GAGAL');
    console.error(`Error   : ${result.error}`);
  }
}

main().catch(console.error);
