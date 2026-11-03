import { Elysia } from "elysia";
import { inboundChatController } from "../modules/chat/chat.controller";
import { InboundMessageSchema } from "../modules/chat/chat.schema";

export const chatRoutes = new Elysia()
  // POST /api/chat/inbound
  .post("/inbound", inboundChatController, {
    body: InboundMessageSchema,
  });
