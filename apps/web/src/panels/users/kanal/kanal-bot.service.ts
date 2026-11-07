import type { KanalStatusData } from './kanal.types';

/**
 * Service to manage Kanal bot connections (WhatsApp & Telegram) via backend APIs.
 */

export async function fetchKanalStatus(): Promise<{
	success: boolean;
	data?: KanalStatusData;
	error?: string;
}> {
	try {
		const res = await fetch('/api/owner/kanal/status', {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return {
				success: false,
				error: json.message || 'Gagal memuat status kanal integrasi.'
			};
		}
		const data = json.data || (json.whatsapp ? (json as any) : undefined);
		return { success: true, data };
	} catch (err: any) {
		return { success: false, error: err.message || 'Network error' };
	}
}

export async function reconnectWhatsapp(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const res = await fetch('/api/bot/whatsapp/reset', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({})
		});
		const json = await res.json();
		const isSuccess = res.ok && (json.status === 'ok' || json.success === true);
		if (!isSuccess) {
			return { success: false, error: json.message || 'Gagal menghubungkan ulang WhatsApp.' };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

export async function disconnectWhatsapp(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const res = await fetch('/api/bot/whatsapp/disconnect', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({})
		});
		const json = await res.json();
		const isSuccess = res.ok && (json.status === 'ok' || json.success === true);
		if (!isSuccess) {
			return { success: false, error: json.message || 'Gagal memutuskan WhatsApp.' };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

export async function verifyTelegramToken(token: string): Promise<{
	success: boolean;
	botId?: string;
	username?: string;
	firstName?: string;
	error?: string;
}> {
	try {
		const res = await fetch('/api/bot/telegram/verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ token: token.trim() })
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return { success: false, error: json.message || 'Token bot Telegram tidak valid.' };
		}
		return {
			success: true,
			botId: json.botId,
			username: json.username,
			firstName: json.firstName
		};
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

export async function testTelegramConnection(): Promise<{
	success: boolean;
	healthy: boolean;
	bot?: { id: string; username: string; firstName: string };
	error?: string;
}> {
	try {
		const res = await fetch('/api/bot/telegram/test', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({})
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return {
				success: false,
				healthy: false,
				error: json.message || 'Koneksi Telegram bermasalah.'
			};
		}
		return {
			success: true,
			healthy: json.data?.healthy ?? true,
			bot: json.data?.bot
		};
	} catch (err: any) {
		return { success: false, healthy: false, error: err.message };
	}
}

export async function disconnectTelegram(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const res = await fetch('/api/bot/telegram/disconnect', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({})
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return { success: false, error: json.message || 'Gagal memutuskan bot Telegram.' };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

/**
 * Sends a 6-digit OTP code to a new owner phone number via WhatsApp.
 */
export async function sendOwnerWhatsappOtp(phone: string): Promise<{
	success: boolean;
	error?: string;
	devCode?: string;
}> {
	try {
		const res = await fetch('/api/bot/otp/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ phone, channel: 'whatsapp' })
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return { success: false, error: json.message || 'Gagal mengirimkan kode OTP ke WhatsApp.' };
		}
		return { success: true, devCode: json.devCode };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

/**
 * Verifies the 6-digit OTP code for the new owner WhatsApp phone number.
 */
export async function verifyOwnerWhatsappOtp(
	phone: string,
	code: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/bot/otp/verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ phone, code: code.trim() })
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return { success: false, error: json.message || 'Kode OTP tidak valid atau sudah kedaluwarsa.' };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

/**
 * Validates the 6-digit Inverted OTP code received by the owner in Telegram chat via /otp.
 */
export async function verifyOwnerTelegramOtp(
	code: string
): Promise<{ success: boolean; chatId?: string; error?: string }> {
	try {
		const res = await fetch('/api/bot/telegram/verify-otp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ code: code.trim() })
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return {
				success: false,
				error: json.message || 'Kode OTP Telegram tidak valid atau sudah kedaluwarsa.'
			};
		}
		return { success: true, chatId: json.chatId };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}
