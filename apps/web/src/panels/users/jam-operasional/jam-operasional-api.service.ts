import type { JamOperasionalData, UpdateJamOperasionalPayload } from './jam-operasional.types';

export interface ApiResponse<T> {
	status: 'ok' | 'error';
	message?: string;
	data?: T;
}

/**
 * Mengambil konfigurasi jam operasional dari backend API Meseid.
 */
export async function fetchJamOperasional(): Promise<JamOperasionalData> {
	try {
		const res = await fetch('/api/owner/jam-operasional', {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			throw new Error(errJson.message || 'Gagal memuat konfigurasi jam operasional.');
		}

		const json = await res.json();
		const result: JamOperasionalData | undefined = json.data ?? (json.business_hours ? json : undefined);
		if (!result) {
			throw new Error('Data jam operasional kosong dari server.');
		}

		return result;
	} catch (err) {
		console.error('[JAM_OPERASIONAL_API] fetchJamOperasional error:', err);
		throw err;
	}
}

/**
 * Menyimpan konfigurasi jam operasional (jadwal mingguan, pengecualian libur, dan pesan balasan) ke backend.
 */
export async function saveJamOperasional(
	payload: UpdateJamOperasionalPayload
): Promise<JamOperasionalData> {
	try {
		const res = await fetch('/api/owner/jam-operasional', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			throw new Error(errJson.message || 'Gagal menyimpan konfigurasi jam operasional.');
		}

		const json = await res.json();
		const result: JamOperasionalData | undefined = json.data ?? (json.business_hours ? json : undefined);
		if (!result) {
			throw new Error('Gagal memperbarui konfigurasi di server.');
		}

		return result;
	} catch (err) {
		console.error('[JAM_OPERASIONAL_API] saveJamOperasional error:', err);
		throw err;
	}
}
