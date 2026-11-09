import type {
  ConfirmedEvent,
  OrderInquiry,
  GoogleCalendarState,
} from './jadwal.types';

export interface ScheduleApiRecord {
  id: string;
  owner_id: string;
  google_event_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  status: string;
  source: string;
}

export interface BookingApiRecord {
  id: string;
  owner_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  requested_start_at: string;
  requested_end_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  schedule_id: string | null;
  notes: string | null;
  has_collision: boolean;
  created_at: string;
}

/**
 * Mengambil daftar jadwal yang terkonfirmasi.
 */
export async function fetchSchedules(timeMin?: string, timeMax?: string): Promise<ConfirmedEvent[]> {
  const params = new URLSearchParams();
  if (timeMin) params.set('timeMin', timeMin);
  if (timeMax) params.set('timeMax', timeMax);

  const url = `/api/owner/jadwal/schedules${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'Gagal memuat jadwal.');
  }

  const json = await res.json();
  const rawList: ScheduleApiRecord[] = json.data ?? [];

  return rawList.map((item) => {
    const s = new Date(item.start_at);
    const e = new Date(item.end_at);
    const dateText = s.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const sTime = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const eTime = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return {
      id: item.id,
      title: item.title,
      dateText,
      timeRange: `${sTime}–${eTime} WIB`,
      note: `${sTime}–${eTime} WIB · ${item.source === 'booking' ? 'Booking Pelanggan' : 'Kalender Usaha'}`,
      type: item.source === 'booking' ? 'order' : 'reminder',
      actionLabel: 'Detail ↗',
      googleEventId: item.google_event_id,
      source: item.source,
      status: item.status,
    };
  });
}

/**
 * Menambahkan jadwal baru secara manual dari dashboard.
 */
export async function createSchedule(payload: {
  title: string;
  start_at: string;
  end_at: string;
  description?: string;
}): Promise<void> {
  const res = await fetch('/api/owner/jadwal/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ...payload, source: 'dashboard' }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'Gagal menambahkan jadwal.');
  }
}

/**
 * Menghapus/membatalkan jadwal.
 */
export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`/api/owner/jadwal/schedules/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'Gagal menghapus jadwal.');
  }
}

/**
 * Mengambil daftar permintaan booking dari pelanggan.
 */
export async function fetchBookings(status?: string): Promise<OrderInquiry[]> {
  const url = status ? `/api/owner/jadwal/bookings?status=${status}` : '/api/owner/jadwal/bookings';
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'Gagal memuat permintaan booking.');
  }

  const json = await res.json();
  const rawList: BookingApiRecord[] = json.data ?? [];

  return rawList.map((b) => {
    const s = new Date(b.requested_start_at);
    const e = new Date(b.requested_end_at);
    const slotDate = s.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const sTime = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const eTime = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const receivedAt = new Date(b.created_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      id: b.id,
      customerName: b.customer_name,
      orderSummary: b.service_name,
      slotDate,
      slotTime: `${sTime}–${eTime} WIB`,
      channel: 'whatsapp',
      receivedAt: `${receivedAt} WIB`,
      hasCollision: Boolean(b.has_collision),
      collisionDetail: b.has_collision
        ? `${slotDate} ${sTime}–${eTime} bertabrakan dengan agenda terkonfirmasi`
        : undefined,
      status: b.status,
    };
  });
}

/**
 * Menyetujui atau menolak booking pelanggan.
 */
export async function respondBooking(id: string, action: 'approve' | 'reject', notes?: string): Promise<void> {
  const res = await fetch(`/api/owner/jadwal/bookings/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, notes }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'Gagal merespons booking.');
  }
}

/**
 * Mengambil status koneksi Google Calendar.
 */
export async function fetchGoogleStatus(): Promise<GoogleCalendarState> {
  const res = await fetch('/api/owner/jadwal/google-status', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    return {
      connected: false,
      calendarId: 'primary',
      scopes: [],
      hasCalendarScope: false,
      lastSyncedAt: null,
    };
  }

  const json = await res.json();
  return json.data ?? {
    connected: false,
    calendarId: 'primary',
    scopes: [],
    hasCalendarScope: false,
    lastSyncedAt: null,
  };
}

/**
 * Memulai sinkronisasi Google Calendar dua arah.
 */
export async function triggerGoogleSync(): Promise<string> {
  const res = await fetch('/api/owner/jadwal/sync-google', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'Gagal sinkronisasi Google Calendar.');
  }

  const json = await res.json();
  return json.message || 'Sinkronisasi selesai.';
}
