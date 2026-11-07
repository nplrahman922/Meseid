/**
 * Sends a 6-digit OTP code to the specified phone number via the backend Bot Gateway.
 */
export async function sendOtpCode(
	phone: string,
	channel: 'whatsapp' | 'telegram' = 'whatsapp'
): Promise<{ success: boolean; error?: string; devCode?: string }> {
	try {
		const res = await fetch('/api/bot/otp/send', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ phone, channel })
		});

		const json = await res.json();
		if (!res.ok) {
			return {
				success: false,
				error: json.message || 'Failed to send verification code.'
			};
		}

		return {
			success: true,
			devCode: json.devCode
		};
	} catch (err: any) {
		console.error('Error sending OTP code:', err);
		return {
			success: false,
			error: err.message || 'Network error while sending verification code.'
		};
	}
}

/**
 * Verifies the 6-digit OTP code with the backend.
 */
export async function verifyOtpCode(
	phone: string,
	code: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/bot/otp/verify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ phone, code })
		});

		const json = await res.json();
		if (!res.ok) {
			return {
				success: false,
				error: json.message || 'Invalid or expired OTP code.'
			};
		}

		return { success: true };
	} catch (err: any) {
		console.error('Error verifying OTP code:', err);
		return {
			success: false,
			error: err.message || 'Network error while verifying code.'
		};
	}
}

/**
 * Fetches real-time status and QR code for store WhatsApp bot.
 * Jika sessionId tidak dioper, backend secara otomatis mengisolasi ke sesi milik owner yang terotentikasi.
 */
export async function fetchWhatsappStatus(sessionId?: string): Promise<{
	success: boolean;
	status: 'connecting' | 'open' | 'close' | 'qr_ready' | 'logged_out' | 'conflict';
	qr: string | null;
	phoneNumber: string | null;
	conflictReason?: string | null;
	error?: string;
}> {
	try {
		const url = sessionId
			? `/api/bot/whatsapp/status?sessionId=${encodeURIComponent(sessionId)}`
			: '/api/bot/whatsapp/status';
		const res = await fetch(url, {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return {
				success: false,
				status: 'close',
				qr: null,
				phoneNumber: null,
				error: json.message || 'Failed to fetch WhatsApp status.'
			};
		}

		return {
			success: true,
			status: json.whatsapp?.status || 'close',
			qr: json.whatsapp?.qr || null,
			phoneNumber: json.whatsapp?.phoneNumber || null,
			conflictReason: json.whatsapp?.conflictReason || null
		};
	} catch (err: any) {
		return {
			success: false,
			status: 'close',
			qr: null,
			phoneNumber: null,
			error: err.message
		};
	}
}

/**
 * Resets WhatsApp session to purge stale credentials and start fresh QR code scanning.
 * Jika sessionId tidak dioper, backend secara otomatis mereset sesi milik owner yang terotentikasi.
 */
export async function resetWhatsappSession(sessionId?: string): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const body = sessionId ? { sessionId } : {};
		const res = await fetch('/api/bot/whatsapp/reset', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(body)
		});

		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return {
				success: false,
				error: json.message || 'Failed to reset WhatsApp session.'
			};
		}

		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

/**
 * Verifies custom Telegram bot token via Telegram getMe API.
 */
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
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ token: token.trim() })
		});

		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return {
				success: false,
				error: json.message || 'Invalid Telegram bot token.'
			};
		}

		return {
			success: true,
			botId: json.botId,
			username: json.username,
			firstName: json.firstName
		};
	} catch (err: any) {
		return {
			success: false,
			error: err.message || 'Network error while verifying Telegram token.'
		};
	}
}

/**
 * Memvalidasi 6-digit kode OTP Telegram (Inverted OTP) yang diminta owner dari bot.
 */
export async function verifyTelegramOtpCode(
	code: string
): Promise<{ success: boolean; error?: string; chatId?: string }> {
	try {
		const res = await fetch('/api/bot/telegram/verify-otp', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
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

		return {
			success: true,
			chatId: json.chatId
		};
	} catch (err: any) {
		return {
			success: false,
			error: err.message || 'Network error while verifying Telegram OTP.'
		};
	}
}
