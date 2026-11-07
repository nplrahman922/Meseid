import type { OverviewData } from './overview.types';
import { markOverviewSeen } from './overview-storage.service';

/**
 * Submits the complete onboarding payload atomically to the backend.
 */
export async function submitOnboarding(
	data: OverviewData
): Promise<{ success: boolean; error?: string }> {
	try {
		const connectedBots: Array<{
			channel: 'whatsapp' | 'telegram';
			externalAccountId: string;
		}> = [];

		if (data.whatsappConnected) {
			connectedBots.push({
				channel: 'whatsapp',
				externalAccountId: data.ownerPhone || 'wa-session-default'
			});
		}
		if (data.telegramToken) {
			connectedBots.push({
				channel: 'telegram',
				externalAccountId: data.telegramToken
			});
		}

		const payload = {
			userName: data.userName,
			businessName: data.businessName?.trim() || data.userName || 'Bisnis Saya',
			businessType: data.businessType || 'kuliner',
			customCategory: data.customCategory || undefined,
			businessDescription: data.businessDescription || undefined,
			ownerPhone: data.ownerPhone || undefined,
			phoneVerified: data.phoneVerified ?? false,
			connectedBots: connectedBots.length > 0 ? connectedBots : undefined,
			personalization: {
				botName: data.storeBotName?.trim() || 'Admin Toko',
				assistantBotName: data.assistantBotName?.trim() || 'Asisten Bisnis',
				speakingStyles: data.storeSpeakingStyles || [],
				customRules: data.storeCustomRules || [],
				assistantSpeakingStyles: data.assistantSpeakingStyles || [],
				assistantCustomRules: data.assistantCustomRules || [],
				storeLanguage: data.storeLanguage || undefined,
				assistantLanguage: data.assistantLanguage || undefined
			},
			knowledgeBase: (data.knowledgeBase || []).map((item) => ({
				category: item.category || 'faq',
				title: item.title,
				content: item.description,
				is_internal: item.onlyAssistant ?? false
			}))
		};

		const res = await fetch('/api/owner/onboarding', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(payload)
		});

		const json = await res.json();
		if (!res.ok) {
			return {
				success: false,
				error: json.message || 'Failed to persist onboarding setup.'
			};
		}

		markOverviewSeen();
		return { success: true };
	} catch (err: any) {
		console.error('Error submitting onboarding setup:', err);
		return {
			success: false,
			error: err.message || 'Network error while saving onboarding setup.'
		};
	}
}

/**
 * Mengambil detail konfigurasi lengkap onboarding dari database untuk Pre-fill halaman Overview.
 */
export async function fetchOnboardingDetail(): Promise<OverviewData | null> {
	try {
		const res = await fetch('/api/owner/onboarding-detail', {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		if (!res.ok) return null;
		const json = await res.json();
		const d = json.data;
		if (!d || (json.status !== 'ok' && !json.success)) return null;

		return {
			userName: d.userName || '',
			businessName: d.businessName || '',
			businessType: d.businessType || 'kuliner',
			customCategory: d.customCategory || '',
			businessDescription: d.businessDescription || '',
			ownerPhone: d.ownerPhone || '',
			phoneVerified: d.phoneVerified ?? false,
			telegramToken: d.telegramToken || '',
			telegramVerified: d.telegramVerified ?? false,
			telegramOwnerChatId: d.telegramOwnerChatId || '',
			whatsappConnected: d.whatsappConnected ?? false,
			agreedToPolicy: true,
			storeBotName: d.storeBotName || 'Admin Toko',
			assistantBotName: d.assistantBotName || 'Asisten Bisnis',
			storeSpeakingStyles: d.storeSpeakingStyles || ['Ramah', 'Informatif'],
			storeCustomRules: d.storeCustomRules || [],
			storeLanguage: d.storeLanguage || '',
			assistantSpeakingStyles: d.assistantSpeakingStyles || ['Ramah', 'Informatif'],
			assistantCustomRules: d.assistantCustomRules || [],
			assistantLanguage: d.assistantLanguage || '',
			knowledgeBase: Array.isArray(d.knowledgeBase)
				? d.knowledgeBase.map((k: any) => ({
						title: k.title,
						category: k.category,
						description: k.description,
						onlyAssistant: k.onlyAssistant ?? false
				  }))
				: []
		};
	} catch (err) {
		console.warn('Failed to fetch onboarding detail:', err);
		return null;
	}
}

/**
 * Retrieves the current onboarding completion status from the backend.
 */
export async function fetchOnboardingStatus(): Promise<{
	onboardingCompleted: boolean;
	businessName?: string;
	phone?: string;
	kbCount?: number;
} | null> {
	try {
		const res = await fetch('/api/owner/onboarding-status', {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		if (!res.ok) return null;
		const json = await res.json();
		return json.onboarding || null;
	} catch (err) {
		console.warn('Failed to query backend onboarding status:', err);
		return null;
	}
}
