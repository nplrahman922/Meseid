/**
 * Service untuk memuat dan menyimpan konfigurasi Moderasi & Sensor Kata Terlarang Owner
 */

export async function fetchModerationSettings(): Promise<{
	success: boolean;
	bannedWords?: string[];
	groupModerationEnabled?: boolean;
	error?: string;
}> {
	try {
		const res = await fetch('/api/owner/personalisasi', {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return { success: false, error: json.message || 'Gagal memuat pengaturan moderasi.' };
		}
		const cfg = json.data?.config || json.config || {};
		return {
			success: true,
			bannedWords: Array.isArray(cfg.banned_words) ? cfg.banned_words : [],
			groupModerationEnabled: cfg.group_moderation_enabled !== false
		};
	} catch (err: any) {
		return { success: false, error: err.message || 'Network error' };
	}
}

export async function updateModerationSettings(
	bannedWords: string[],
	groupModerationEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/owner/personalisasi', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				banned_words: bannedWords,
				group_moderation_enabled: groupModerationEnabled
			})
		});
		const json = await res.json();
		if (!res.ok || json.status !== 'ok') {
			return { success: false, error: json.message || 'Gagal menyimpan pengaturan moderasi.' };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message || 'Network error' };
	}
}
