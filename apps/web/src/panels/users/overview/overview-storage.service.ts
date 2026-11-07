import { defaultOverviewData, type OverviewData } from './overview.types';

const STORAGE_KEY_COMPLETED = 'meseid_overview_completed';
const STORAGE_KEY_DRAFT = 'meseid_overview_draft';

/**
 * Cek apakah user telah menyelesaikan alur overview/onboarding
 * SSR-safe: mengembalikan false jika dijalankan di server
 */
export function isOverviewCompleted(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
	} catch (e) {
		console.warn('Gagal membaca storage status overview:', e);
		return false;
	}
}

/**
 * Tandai alur overview selesai di sisi browser
 */
export function markOverviewSeen(): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
	} catch (e) {
		console.warn('Gagal menyimpan status overview selesai:', e);
	}
}

/**
 * Reset status overview & draft data (Hanya untuk keperluan pengujian development)
 */
export function resetOverviewStatus(): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(STORAGE_KEY_COMPLETED);
		localStorage.removeItem(STORAGE_KEY_DRAFT);
	} catch (e) {
		console.warn('Gagal mereset storage overview:', e);
	}
}

/**
 * Simpan draft progres form onboarding
 */
export function saveOverviewDraft(data: Partial<OverviewData>): void {
	if (typeof window === 'undefined') return;
	try {
		const current = getOverviewDraft();
		const merged = { ...current, ...data };
		localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(merged));
	} catch (e) {
		console.warn('Gagal menyimpan draft overview:', e);
	}
}

/**
 * Ambil draft progres form onboarding
 */
export function getOverviewDraft(): OverviewData {
	if (typeof window === 'undefined') return { ...defaultOverviewData };
	try {
		const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
		if (!raw) return { ...defaultOverviewData };
		const parsed = JSON.parse(raw);
		return {
			...defaultOverviewData,
			...parsed,
			storeSpeakingStyles: parsed.storeSpeakingStyles || defaultOverviewData.storeSpeakingStyles,
			storeCustomRules: parsed.storeCustomRules || defaultOverviewData.storeCustomRules,
			storeLanguage: parsed.storeLanguage || '',
			assistantSpeakingStyles: parsed.assistantSpeakingStyles || defaultOverviewData.assistantSpeakingStyles,
			assistantCustomRules: parsed.assistantCustomRules || defaultOverviewData.assistantCustomRules,
			assistantLanguage: parsed.assistantLanguage || '',
		};
	} catch (e) {
		console.warn('Gagal mengambil draft overview:', e);
		return { ...defaultOverviewData };
	}
}
