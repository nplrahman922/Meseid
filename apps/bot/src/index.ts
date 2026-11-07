import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  startTelegramBot,
  sendTelegramMessage,
  telegramBotManager,
} from './telegram';
import {
  startWhatsAppBot,
  sendWhatsAppMessage,
  whatsAppBotManager,
} from './whatsapp';
import { renderQrPageHtml } from './whatsapp/views/qr-page.view';
import { closeRedisClient } from './redis/client';
import { createModuleLogger } from './logs';

const systemLogger = createModuleLogger('system');
const botLogger = createModuleLogger('bot');

const app = new Hono();

// 1. Healthcheck Endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'meseid-bot',
    redis: process.env.REDIS_URL ? 'enabled' : 'disabled',
    telegram: {
      active_bots: telegramBotManager.getAllBots().size,
      mode: process.env.TELEGRAM_MODE || 'polling',
    },
    whatsapp: {
      active_sessions: whatsAppBotManager.getAllSessions().size,
      sessions: whatsAppBotManager.getSessionStatuses(),
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
      const recipientId =
        body.recipient_id || body.chat_id || body.target_id || body.phone;
      if (!recipientId || !body.message) {
        return c.json({ error: 'recipient_id dan message wajib diisi.' }, 400);
      }

      const result = await sendWhatsAppMessage({
        channel: 'whatsapp',
        session_id: body.session_id || body.bot_id,
        recipient_id: String(recipientId),
        message: body.message,
        options: body.options,
      });

      if (!result.success) {
        return c.json({ error: result.error || 'Gagal mengirim pesan WhatsApp' }, 500);
      }

      return c.json({ success: true, message_id: result.message_id });
    }

    return c.json({ error: `Channel '${body.channel}' tidak didukung.` }, 400);
  } catch (err: any) {
    botLogger.error('Kesalahan pemrosesan pada endpoint /send', err);
    return c.json({ error: err.message }, 500);
  }
});

// 3. Webhook Route untuk Telegram Server Tailscale / Production
app.post('/telegram/webhook/:botId', async (c) => {
  const botId = c.req.param('botId');
  const handler = telegramBotManager.createWebhookHandler(botId);

  if (!handler) {
    botLogger.warn(`Webhook request ditolak: Bot ID ${botId} tidak ditemukan`);
    return c.json({ error: `Bot ID ${botId} tidak ditemukan` }, 404);
  }

  return handler(c);
});

// 4. WhatsApp Sesi & QR Monitoring Endpoint
app.get('/whatsapp/qr/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const isJson =
    c.req.query('format') === 'json' ||
    c.req.header('accept')?.includes('application/json');

  let session = whatsAppBotManager.getSession(sessionId);

  // Jika diminta JSON (status check) dan sesi belum ada/sedang ditutup, kembalikan status close secara aman
  if (!session && isJson) {
    return c.json({
      sessionId,
      status: 'close',
      qr: null,
      phoneNumber: null,
      conflictReason: null,
    });
  }

  if (!session) {
    const resolvedOwnerId = sessionId.startsWith('owner_')
      ? sessionId.replace(/^owner_/, '').replace(/_/g, '-')
      : undefined;

    try {
      await whatsAppBotManager.getOrCreateSession(sessionId, resolvedOwnerId);
      session = whatsAppBotManager.getSession(sessionId);
    } catch (err: any) {
      botLogger.error(`Gagal membuat sesi WhatsApp on-demand '${sessionId}'`, err);
      return c.json({ error: `Gagal membuat sesi WhatsApp '${sessionId}': ${err.message}` }, 500);
    }
  }

  const qr = whatsAppBotManager.getQr(sessionId);

  if (!session) {
    return c.json({ error: `Sesi WhatsApp '${sessionId}' tidak ditemukan` }, 404);
  }

  if (isJson) {
    return c.json({
      sessionId,
      status: session.status,
      qr: qr || null,
      phoneNumber: session.phoneNumber || null,
      conflictReason: session.conflictReason || null,
    });
  }

  // Tampilan visual HTML ramah pengguna untuk di-scan langsung dari layar HP / Desktop
  const isConnected = session.status === 'open';
  const isConflict = session.status === 'conflict';
  const qrUrl = qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qr)}`
    : '';

  const html = renderQrPageHtml({
    sessionId,
    isConnected,
    isConflict,
    conflictReason: session.conflictReason,
    phoneNumber: session.phoneNumber,
    qrUrl,
    internalSecret: process.env.INTERNAL_API_SECRET,
  });

  return c.html(html);
});

app.get('/whatsapp/status/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = whatsAppBotManager.getSession(sessionId);

  if (!session) {
    return c.json({
      sessionId,
      status: 'close',
      phoneNumber: null,
      conflictReason: null,
    });
  }

  return c.json({
    sessionId,
    status: session.status,
    phoneNumber: session.phoneNumber || null,
    conflictReason: session.conflictReason || null,
  });
});

// 5. WhatsApp Sesi Reset Endpoint (Memulai Siklus QR Baru untuk Scan HP)
app.post('/whatsapp/session/reset/:sessionId', async (c) => {
  const secret = c.req.header('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const sessionId = c.req.param('sessionId');
  try {
    await whatsAppBotManager.resetSession(sessionId);
    return c.json({
      success: true,
      message: `WhatsApp session '${sessionId}' has been reset. Awaiting QR scan.`,
      sessionId,
      status: 'connecting',
    });
  } catch (err: any) {
    botLogger.error(`Failed to reset WhatsApp session '${sessionId}'`, err);
    return c.json({ error: err.message }, 500);
  }
});

// 5b. WhatsApp Sesi Stop / Disconnect Endpoint
app.post('/whatsapp/session/stop/:sessionId', async (c) => {
  const secret = c.req.header('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const sessionId = c.req.param('sessionId');
  try {
    await whatsAppBotManager.stopSession(sessionId, true);
    return c.json({
      success: true,
      message: `WhatsApp session '${sessionId}' has been disconnected.`,
      sessionId,
      status: 'disconnected',
    });
  } catch (err: any) {
    botLogger.error(`Failed to stop WhatsApp session '${sessionId}'`, err);
    return c.json({ error: err.message }, 500);
  }
});

// 6. Telegram Token Verification & Auto-Registration Endpoint
app.post('/telegram/verify', async (c) => {
  const secret = c.req.header('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const token = body?.token;
    if (!token || typeof token !== 'string') {
      return c.json({ error: 'token parameter is required' }, 400);
    }

    const result = await telegramBotManager.verifyAndRegisterBot(token);
    if (!result.valid) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      botId: result.botId,
      username: result.username,
      firstName: result.firstName,
    });
  } catch (err: any) {
    botLogger.error('Failed to verify Telegram bot token', err);
    return c.json({ error: err.message }, 500);
  }
});

// 6b. Telegram Bot Stop / Disconnect Endpoint
app.post('/telegram/stop/:botId', async (c) => {
  const secret = c.req.header('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const botId = c.req.param('botId');
  try {
    await telegramBotManager.stopBot(botId);
    return c.json({
      success: true,
      message: `Telegram bot '${botId}' has been stopped.`,
    });
  } catch (err: any) {
    botLogger.error(`Failed to stop Telegram bot '${botId}'`, err);
    return c.json({ error: err.message }, 500);
  }
});

// Inisialisasi Modul Telegram & WhatsApp
startTelegramBot().catch((err) => {
  systemLogger.error('Gagal menginisialisasi modul Telegram', err);
});

startWhatsAppBot().catch((err) => {
  systemLogger.error('Gagal menginisialisasi modul WhatsApp Baileys', err);
});

// Jalankan Hono Server di port 3001
const port = Number(process.env.PORT) || 3001;
const server = serve({ fetch: app.fetch, port }, () => {
  systemLogger.info(`🤖 Meseid Bot Gateway aktif di http://localhost:${port}`);
});

// Graceful Shutdown
const shutdown = async () => {
  systemLogger.info('Menutup layanan bot secara aman...');
  await Promise.allSettled([
    telegramBotManager.stopAll(),
    whatsAppBotManager.stopAll(),
    closeRedisClient(),
  ]);
  server.close();
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);