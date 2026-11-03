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
app.get('/whatsapp/qr/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  const qr = whatsAppBotManager.getQr(sessionId);
  const session = whatsAppBotManager.getSession(sessionId);

  if (!session) {
    return c.json({ error: `Sesi WhatsApp '${sessionId}' tidak ditemukan` }, 404);
  }

  // Jika diminta JSON (via query ?format=json atau header application/json)
  const isJson =
    c.req.query('format') === 'json' ||
    c.req.header('accept')?.includes('application/json');

  if (isJson) {
    return c.json({
      sessionId,
      status: session.status,
      qr: qr || null,
      phoneNumber: session.phoneNumber || null,
    });
  }

  // Tampilan visual HTML ramah pengguna untuk di-scan langsung dari layar HP / Desktop
  const isConnected = session.status === 'open';
  const qrUrl = qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qr)}`
    : '';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan QR WhatsApp - Meseid Bot</title>
  ${!isConnected ? '<meta http-equiv="refresh" content="8">' : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.95rem; margin-top: 0; }
    .qr-box {
      background: #ffffff;
      padding: 1rem;
      border-radius: 0.75rem;
      display: inline-block;
      margin: 1rem 0;
    }
    .qr-box img { display: block; max-width: 100%; height: auto; }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-success { background: #065f46; color: #34d399; }
    .badge-waiting { background: #854d0e; color: #fde047; }
    .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📱 Meseid WhatsApp Bot</h1>
    <p>Sesi: <code>${sessionId}</code></p>
    ${
      isConnected
        ? `
      <div style="margin: 2rem 0;">
        <span class="badge badge-success">🟢 Terhubung Aktif</span>
        <h3 style="margin-top: 1rem; color: #38bdf8;">${session.phoneNumber || 'Nomor WhatsApp'}</h3>
        <p style="margin-top: 0.5rem;">Bot sudah siap mengirim dan menerima pesan transaksi.</p>
      </div>
      `
        : qrUrl
        ? `
      <span class="badge badge-waiting">🟡 Menunggu Scan QR</span>
      <div class="qr-box">
        <img src="${qrUrl}" alt="Scan QR Code" width="280" height="280" />
      </div>
      <p>Buka WhatsApp di HP Anda &gt; <b>Perangkat Tertaut</b> &gt; <b>Tautkan Perangkat</b> lalu scan QR di atas.</p>
      <div class="footer">Halaman akan me-refresh otomatis setiap 8 detik...</div>
      `
        : `
      <div style="margin: 2rem 0;">
        <span class="badge badge-waiting">⏳ Memuat Sesi...</span>
        <p style="margin-top: 1rem;">Sedang menghubungkan ke server WhatsApp...</p>
      </div>
      <div class="footer">Halaman akan me-refresh otomatis...</div>
      `
    }
  </div>
</body>
</html>`;

  return c.html(html);
});

app.get('/whatsapp/status/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  const session = whatsAppBotManager.getSession(sessionId);

  if (!session) {
    return c.json({ error: `Sesi WhatsApp '${sessionId}' tidak ditemukan` }, 404);
  }

  return c.json({
    sessionId,
    status: session.status,
    phoneNumber: session.phoneNumber || null,
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