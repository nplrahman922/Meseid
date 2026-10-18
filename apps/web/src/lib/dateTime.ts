/**
 * Detects the user's or target timezone code (WIB, WITA, WIT, or UTC offset).
 */
export function getTimezoneCode(targetTz?: string): string {
	if (typeof Intl === 'undefined') return 'WIB';

	const tz = targetTz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

	try {
		const offsetFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			timeZoneName: 'shortOffset'
		});
		const tzPart =
			offsetFormatter.formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';

		if (tzPart.includes('+7') || tzPart.includes('+07')) return 'WIB';
		if (tzPart.includes('+8') || tzPart.includes('+08')) return 'WITA';
		if (tzPart.includes('+9') || tzPart.includes('+09')) return 'WIT';

		return tzPart.replace('GMT', 'UTC') || 'WITA';
	} catch {
		return 'WIB';
	}
}

/**
 * Returns Indonesian formatted date and time for Admin Dashboard.
 * Automatically detects the browser/system timezone (e.g. WITA, WIB, WIT)
 * or uses the specified target timezone.
 * Format: "18 Oktober 2026 · 22.02 WITA"
 */
export function formatAdminDateTime(date: Date = new Date(), targetTz?: string): string {
	const tz =
		targetTz ||
		(typeof Intl !== 'undefined'
			? Intl.DateTimeFormat().resolvedOptions().timeZone
			: 'Asia/Jakarta');

	try {
		const formatter = new Intl.DateTimeFormat('id-ID', {
			timeZone: tz,
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		const parts = formatter.formatToParts(date);
		const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

		const day = get('day');
		const month = get('month');
		const year = get('year');
		const hour = get('hour').padStart(2, '0');
		const minute = get('minute').padStart(2, '0');
		const tzCode = getTimezoneCode(tz);

		return `${day} ${month} ${year} · ${hour}.${minute} ${tzCode}`;
	} catch {
		const day = date.getDate();
		const hour = String(date.getHours()).padStart(2, '0');
		const minute = String(date.getMinutes()).padStart(2, '0');
		return `${day} Oktober ${date.getFullYear()} · ${hour}.${minute} WIB`;
	}
}

/**
 * Returns Indonesian formatted date and time for User Dashboard.
 * Automatically respects the business/owner timezone (e.g. from owner.timezone)
 * or detects the local browser timezone (WIB, WITA, WIT).
 * Format: "Minggu, 18 Okt 2026 · 22.02 WITA"
 */
export function formatUserDateTime(date: Date = new Date(), targetTz?: string): string {
	const tz =
		targetTz ||
		(typeof Intl !== 'undefined'
			? Intl.DateTimeFormat().resolvedOptions().timeZone
			: 'Asia/Jakarta');

	try {
		const formatter = new Intl.DateTimeFormat('id-ID', {
			timeZone: tz,
			weekday: 'long',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		const parts = formatter.formatToParts(date);
		const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

		const weekday = get('weekday');
		const day = get('day');
		let month = get('month');
		if (month.endsWith('.')) {
			month = month.slice(0, -1);
		}
		const year = get('year');
		const hour = get('hour').padStart(2, '0');
		const minute = get('minute').padStart(2, '0');
		const tzCode = getTimezoneCode(tz);

		return `${weekday}, ${day} ${month} ${year} · ${hour}.${minute} ${tzCode}`;
	} catch {
		const day = date.getDate();
		const hour = String(date.getHours()).padStart(2, '0');
		const minute = String(date.getMinutes()).padStart(2, '0');
		return `Minggu, ${day} Okt ${date.getFullYear()} · ${hour}.${minute} WIB`;
	}
}
