export interface QrPageParams {
  sessionId: string;
  isConnected: boolean;
  isConflict: boolean;
  conflictReason?: string | null;
  phoneNumber?: string | null;
  qrUrl?: string;
  internalSecret?: string;
}

export function renderQrPageHtml(params: QrPageParams): string {
  const { sessionId, isConnected, isConflict, conflictReason, phoneNumber, qrUrl, internalSecret } = params;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan QR WhatsApp - Meseid Bot</title>
  ${!isConnected && !isConflict ? '<meta http-equiv="refresh" content="8">' : ''}
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
        <h3 style="margin-top: 1rem; color: #38bdf8;">${phoneNumber || 'Nomor WhatsApp'}</h3>
        <p style="margin-top: 0.5rem;">Bot sudah siap mengirim dan menerima pesan transaksi.</p>
      </div>
      `
        : isConflict
        ? `
      <div style="margin: 2rem 0;">
        <span class="badge" style="background: #854d0e; color: #fde047;">⚠️ Konflik Nomor WhatsApp</span>
        <h3 style="margin-top: 1rem; color: #f87171;">Nomor Telah Terdaftar</h3>
        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #cbd5e1;">${conflictReason || 'Nomor WhatsApp ini sudah aktif pada akun bisnis lain.'}</p>
        <p style="margin-top: 0.5rem; font-size: 0.8rem; color: #94a3b8;">Notifikasi keamanan telah dikirimkan ke nomor WhatsApp tersebut. Jika ini adalah nomor Anda, silakan putuskan sambungan dari akun lama terlebih dahulu.</p>
        <button onclick="resetSession()" style="margin-top: 1.5rem; background: #3b82f6; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">
          🔄 Coba Scan Ulang
        </button>
      </div>
      <script>
        function resetSession() {
          fetch('/whatsapp/session/reset/${sessionId}', {
            method: 'POST',
            headers: { 'x-internal-secret': '${internalSecret || ''}' }
          })
            .then(() => window.location.reload())
            .catch(() => window.location.reload());
        }
      </script>
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
}
