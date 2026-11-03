import { env } from '../src/config/env';

async function main() {
  const url = `${env.AI_GATEWAY_URL}/models`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`
    }
  });

  const body = (await res.json()) as { data?: any[] };
  const all = body.data || [];

  const providers = ['openai', 'google', 'anthropic', 'deepseek', 'meta', 'alibaba'];
  
  for (const prov of providers) {
    console.log(`\n================== ${prov.toUpperCase()} MODELS ==================`);
    const list = all.filter((m: any) => m.id.startsWith(prov + '/') && !m.id.includes('batch') && !m.id.includes('embedding'));
    list.slice(0, 15).forEach((m: any) => {
      console.log(`- ${m.id} | in: $${m.pricing?.input} | out: $${m.pricing?.output} | name: ${m.name || m.id}`);
    });
  }
}

main();
