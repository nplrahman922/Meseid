import { aiAdapter } from '../src/adapters/ai';

async function test() {
  console.log('Testing extraction with Nemotron...');
  try {
    const res1 = await aiAdapter.extractChatResponse('Beli bensin 25rb buat nganter pesanan', 'assistant');
    console.log('Nemotron result:', JSON.stringify(res1, null, 2));
  } catch (e: any) {
    console.error('Nemotron error:', e.message);
  }

  console.log('\nTesting extraction with MiniMax...');
  try {
    const res2 = await aiAdapter.chatWithFallback({
      model: 'minimax/minimax-m3.1-flash',
      messages: [
        {
          role: 'system',
          content: 'Kembalikan HANYA JSON: {"reply":"Catatan bensin 25.000 disimpan","intent":"expense","sentiment":"positive","summary":"Beli bensin 25rb","transaction":{"type":"expense","amount":25000,"category":"Operasional","notes":"Beli bensin"}}',
        },
        { role: 'user', content: 'Beli bensin 25rb' },
      ],
      temperature: 0.1,
    });
    console.log('MiniMax raw content:', res2.content);
  } catch (e: any) {
    console.error('MiniMax error:', e.message);
  }
}

test().catch(console.error);
