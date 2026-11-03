import type { Context } from "elysia";
import { env } from "../../config/env";
import { chatService } from "./chat.service";
import type { InboundMessageInput } from "./chat.schema";

export async function inboundChatController(
  ctx: Context<{
    body: InboundMessageInput;
    headers: { "x-internal-secret"?: string };
  }>
) {
  const secretHeader = ctx.headers["x-internal-secret"];

  // 1. Validasi Autentikasi Internal Service Bot <-> API
  if (!secretHeader || secretHeader !== env.INTERNAL_API_SECRET) {
    ctx.set.status = 401;
    return {
      status: "error",
      reply_text: "Akses ditolak: internal secret tidak valid.",
      error: "Unauthorized internal service",
    };
  }

  // 2. Proses Inbound Message
  try {
    const result = await chatService.processInboundMessage(ctx.body);
    return result;
  } catch (err: any) {
    ctx.set.status = 500;
    return {
      status: "error",
      reply_text:
        "Mohon maaf, sistem asisten Meseid sedang mengalami gangguan. Data belum tersimpan. Silakan coba beberapa saat lagi.",
      error: err.message,
    };
  }
}
