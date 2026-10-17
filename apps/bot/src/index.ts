import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok' }))

// dipanggil API untuk mengirim pesan (pengingat, laporan, balasan proses AI)
// app.post('/send', async (c) => {
//   if (c.req.header('x-internal-secret') !== process.env.INTERNAL_API_SECRET) {
//     return c.json({ error: 'unauthorized' }, 401)
//   }
//   const body = await c.req.json()
//   // TODO: kirim lewat sesi WhatsApp/Telegram milik owner terkait
//   return c.json({ queued: true })
// })

serve({ fetch: app.fetch, port: 3001 })