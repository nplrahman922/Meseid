import { t } from "elysia";

export const InboundMessageSchema = t.Object({
  channel: t.Union([t.Literal("telegram"), t.Literal("whatsapp")]),
  bot_id: t.String({ minLength: 1 }),
  external_message_id: t.String({ minLength: 1 }),
  sender_id: t.String({ minLength: 1 }),
  sender_name: t.String(),
  sender_username: t.Optional(t.String()),
  chat_id: t.String({ minLength: 1 }),
  chat_type: t.String(),
  message_type: t.String(),
  text: t.Optional(t.String()),
  quoted_text: t.Optional(t.String()),
  is_from_me: t.Optional(t.Boolean()),
  callback_data: t.Optional(t.String()),
  attachments: t.Optional(
    t.Array(
      t.Object({
        file_id: t.Optional(t.String()),
        file_type: t.String(),
        mime_type: t.Optional(t.String()),
        file_size: t.Optional(t.Number()),
        data_base64: t.Optional(t.String()),
      })
    )
  ),
  timestamp: t.Number(),
});

export type InboundMessageInput = typeof InboundMessageSchema.static;

export interface InboundChatResult {
  status: "success" | "error" | "ignored";
  reply_text?: string;
  action_buttons?: Array<{
    label: string;
    callback_data: string;
  }>;
  error?: string;
}
