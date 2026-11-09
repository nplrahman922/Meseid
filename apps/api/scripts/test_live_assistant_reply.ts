async function main() {
  const secret = process.env.INTERNAL_API_SECRET || "meseid_internal_secret_change_in_production_key_32c";
  const url = process.env.API_URL || "http://127.0.0.1:3000/api/chat/inbound";

  console.log(`[TEST RUNNER] Testing coding query from Owner (+6281385266775)...`);

  const payload = {
    channel: "whatsapp",
    bot_id: "6281522849183",
    external_message_id: "test_live_coding_" + Date.now(),
    sender_id: "6281385266775",
    sender_name: "EnBee",
    chat_id: "6281385266775@s.whatsapp.net",
    chat_type: "private",
    message_type: "text",
    text: "Punten EnBee, kumaha damang?",
    timestamp: Math.floor(Date.now() / 1000),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify(payload),
  });

  const json: any = await res.json();
  console.log(`[TEST RUNNER] Status: ${res.status}`);
  console.log(`[TEST RUNNER] Response:`, JSON.stringify(json, null, 2));

  if (json.reply_text) {
    console.log("\n=======================================================");
    console.log("BALASAN ASISTEN DARI NEMOTRON UNTUK TUAN MUDA (CODING PYTHON):");
    console.log(json.reply_text);
    console.log("=======================================================\n");
  }
}

main().catch(console.error);
