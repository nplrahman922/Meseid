import type { KnowledgeBaseEntry, NewEntryPayload, UnansweredQuestion, CsvKnowledgeBaseItem } from './knowledge-base.types';

export interface ApiResponse<T> {
	status: 'ok' | 'error';
	message?: string;
	data?: T;
}

/**
 * Mengambil daftar Knowledge Base dari backend.
 */
export async function fetchKnowledgeBaseList(params?: {
	category?: string;
	is_internal?: boolean;
}): Promise<KnowledgeBaseEntry[]> {
	try {
		const query = new URLSearchParams();
		if (params?.category) query.set('category', params.category);
		if (params?.is_internal !== undefined) query.set('is_internal', String(params.is_internal));

		const res = await fetch(`/api/owner/kb${query.toString() ? '?' + query.toString() : ''}`, {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		if (!res.ok) throw new Error('Gagal mengambil data knowledge base.');
		const json: any = await res.json();
		return json.data?.items || json.items || [];
	} catch (err) {
		console.error('[KB_API] fetchKnowledgeBaseList error:', err);
		throw err;
	}
}

/**
 * Membuat entri Knowledge Base baru.
 */
export async function createKnowledgeBaseEntry(payload: NewEntryPayload): Promise<KnowledgeBaseEntry> {
	try {
		const res = await fetch('/api/owner/kb', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				category: payload.category.trim(),
				title: payload.title.trim(),
				content: payload.content.trim(),
				is_internal: payload.is_internal ?? false
			})
		});

		const json: any = await res.json();
		const item = json.data?.item || json.item;
		if (!res.ok || json.status === 'error' || !item) {
			throw new Error(json.message || 'Gagal menambahkan entri knowledge base.');
		}
		return item;
	} catch (err) {
		console.error('[KB_API] createKnowledgeBaseEntry error:', err);
		throw err;
	}
}

/**
 * Mengubah entri Knowledge Base yang sudah ada.
 */
export async function updateKnowledgeBaseEntry(
	id: string,
	payload: Partial<NewEntryPayload>
): Promise<KnowledgeBaseEntry> {
	try {
		const res = await fetch(`/api/owner/kb/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(payload)
		});

		const json: any = await res.json();
		const item = json.data?.item || json.item;
		if (!res.ok || json.status === 'error' || !item) {
			throw new Error(json.message || 'Gagal memperbarui entri knowledge base.');
		}
		return item;
	} catch (err) {
		console.error('[KB_API] updateKnowledgeBaseEntry error:', err);
		throw err;
	}
}

/**
 * Menghapus entri Knowledge Base berdasarkan ID.
 */
export async function deleteKnowledgeBaseEntry(id: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/owner/kb/${id}`, {
			method: 'DELETE',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		const json = await res.json();
		if (!res.ok || json.status === 'error') {
			throw new Error(json.message || 'Gagal menghapus entri knowledge base.');
		}
		return true;
	} catch (err) {
		console.error('[KB_API] deleteKnowledgeBaseEntry error:', err);
		throw err;
	}
}

/**
 * Mengimpor banyak entri Knowledge Base sekaligus (Batch / CSV import).
 */
export async function batchImportKnowledgeBase(
	items: CsvKnowledgeBaseItem[]
): Promise<KnowledgeBaseEntry[]> {
	try {
		const res = await fetch('/api/owner/kb/batch', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ items })
		});

		const json: any = await res.json();
		const resultItems = json.data?.items || json.items;
		if (!res.ok || json.status === 'error' || !resultItems) {
			throw new Error(json.message || 'Gagal mengimpor data knowledge base.');
		}
		return resultItems;
	} catch (err) {
		console.error('[KB_API] batchImportKnowledgeBase error:', err);
		throw err;
	}
}

/**
 * Mengambil daftar pertanyaan pelanggan yang belum terjawab oleh bot.
 */
export async function fetchUnansweredQuestions(resolved: boolean = false): Promise<UnansweredQuestion[]> {
	try {
		const res = await fetch(`/api/owner/kb/unanswered?resolved=${resolved}`, {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		if (!res.ok) throw new Error('Gagal mengambil daftar pertanyaan belum terjawab.');
		const json: any = await res.json();
		return json.data?.questions || json.questions || [];
	} catch (err) {
		console.error('[KB_API] fetchUnansweredQuestions error:', err);
		throw err;
	}
}

/**
 * Menandai pertanyaan belum terjawab sebagai terselesaikan (misal setelah dijadikan KB).
 */
export async function resolveUnansweredQuestion(
	id: string,
	resolvedByKbId?: string
): Promise<UnansweredQuestion> {
	try {
		const res = await fetch(`/api/owner/kb/unanswered/${id}/resolve`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ resolved_by_kb_id: resolvedByKbId })
		});

		const json: any = await res.json();
		const question = json.data?.question || json.question;
		if (!res.ok || json.status === 'error' || !question) {
			throw new Error(json.message || 'Gagal menyelesaikan pertanyaan.');
		}
		return question;
	} catch (err) {
		console.error('[KB_API] resolveUnansweredQuestion error:', err);
		throw err;
	}
}
