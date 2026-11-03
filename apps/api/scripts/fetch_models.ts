import { env } from '../src/config/env';

async function main() {
  const url = `${env.AI_GATEWAY_URL}/models`;
  console.log(`Fetching models from: ${url}`);
  console.log(`Using API Key prefix: ${env.AI_PROVIDER_API_KEY.slice(0, 8)}...`);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`
      }
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    
    try {
      const data = JSON.parse(text);
      console.log('Total models returned:', data.data?.length ?? data.length ?? 0);
      
      const models = data.data || data || [];
      if (Array.isArray(models)) {
        console.log('\nSample models:');
        models.slice(0, 15).forEach((m: any) => {
          console.log(`- ID: ${m.id}, Name: ${m.name || m.id}, Owned By: ${m.owned_by || m.pricing?.input}`);
        });

        // Search for VLM / Vision, LMM, and recent models
        const visionModels = models.filter((m: any) => 
          m.id?.includes('vision') || 
          m.id?.includes('4o') || 
          m.id?.includes('sonnet') || 
          m.id?.includes('flash') || 
          m.id?.includes('gemini') || 
          m.id?.includes('vl') ||
          m.id?.includes('claude') ||
          m.id?.includes('qwen') ||
          m.id?.includes('deepseek')
        );

        console.log('\n--- Relevant Modern Models (VLM / LMM / LLM) ---');
        visionModels.forEach((m: any) => {
          console.log(`ID: ${m.id} | Pricing: in=${m.pricing?.input || '?'}, out=${m.pricing?.output || '?'}`);
        });
      }
    } catch {
      console.log('Response text (first 500 chars):', text.slice(0, 500));
    }
  } catch (err: any) {
    console.error('Error fetching models:', err.message);
  }
}

main();
