import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  startTelegramBot,
  sendTelegramMessage,
  telegramBotManager,
} from './telegram';
import { createModuleLogger } from './logs';

const systemLogger = createModuleLogger('system');
const botLogger = createModuleLogger('bot');

const app = new Hono();

// 1. Healthcheck Endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'meseid-bot',
    telegram: {
      active_bots: telegramBotManager.getAllBots().size,
      mode: process.env.TELEGRAM_MODE || 'polling',
    },
  });
});

// 2. Endpoint Kirim Pesan Outbound (dipanggil oleh Backend API)
app.post('/send', async (c) => {
  const secret = c.req.header('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    botLogger.warn('Upaya akses /send tidak terotorisasi (invalid x-internal-secret)', {
      ip: c.req.header('x-forwarded-for') || 'local',
    });
    return c.json({ error: 'unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();

    if (body.channel === 'telegram') {
      const recipientId = body.recipient_id || body.chat_id || body.target_id;
      if (!recipientId || !body.message) {
        return c.json({ error: 'recipient_id dan message wajib diisi.' }, 400);
      }

      const result = await sendTelegramMessage({
        channel: 'telegram',
        bot_id: body.bot_id,
        recipient_id: String(recipientId),
        message: body.message,
        options: body.options,
      });

      if (!result.success) {
        return c.json({ error: result.error || 'Gagal mengirim pesan Telegram' }, 500);
      }

      return c.json({ success: true, message_id: result.message_id });
    }

    if (body.channel === 'whatsapp') {
      // Placeholder untuk WhatsApp Baileys
      return c.json({ queued: true, channel: 'whatsapp' });
    }

    return c.json({ error: `Channel '${body.channel}' tidak didukung.` }, 400);
  } catch (err: any) {
    botLogger.error('Kesalahan pemrosesan pada endpoint /send', err);
    return c.json({ error: err.message }, 500);
  }
});

// 3. Webhook Route untuk Server Tailscale / Production
app.post('/telegram/webhook/:botId', async (c) => {
  const botId = c.req.param('botId');
  const handler = telegramBotManager.createWebhookHandler(botId);

  if (!handler) {
    botLogger.warn(`Webhook request ditolak: Bot ID ${botId} tidak ditemukan`);
    return c.json({ error: `Bot ID ${botId} tidak ditemukan` }, 404);
  }

  return handler(c);
});

// Inisialisasi Modul Telegram
startTelegramBot().catch((err) => {
  systemLogger.error('Gagal menginisialisasi modul Telegram', err);
});

// Jalankan Hono Server di port 3001
const port = Number(process.env.PORT) || 3001;
const server = serve({ fetch: app.fetch, port }, () => {
  systemLogger.info(`🤖 Meseid Bot Gateway aktif di http://localhost:${port}`);
});

// Graceful Shutdown
const shutdown = async () => {
  systemLogger.info('Menutup layanan bot secara aman...');
  await telegramBotManager.stopAll();
  server.close();
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);