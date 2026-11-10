<script lang="ts">
	import type { ConfirmedEvent, WeeklyDaySchedule } from '../jadwal.types';

	interface Props {
		events?: ConfirmedEvent[];
		onSelectEvent?: (event: ConfirmedEvent) => void;
		onDeleteEvent?: (id: string) => void;
	}

	let { events = [], onSelectEvent, onDeleteEvent }: Props = $props();

	// Calculate dynamic 7 days for the current week (Senin..Minggu)
	let weeklyDays = $derived.by(() => {
		const now = new Date();
		// Mon = 1, ..., Sun = 7
		const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
		const monday = new Date(now);
		monday.setDate(now.getDate() - (dayOfWeek - 1));

		const dayNamesShort = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
		const result: WeeklyDaySchedule[] = [];

		for (let i = 0; i < 7; i++) {
			const d = new Date(monday);
			d.setDate(monday.getDate() + i);

			const dateNum = d.getDate();
			const dayName = `${dayNamesShort[i]} ${dateNum}`;

			// Check if any confirmed event falls on this date
			const matchingEvents = events.filter((ev) => {
				const evStr = (ev.dateText || ev.title || '').toLowerCase();
				return evStr.includes(String(dateNum));
			});

			let eventText = 'Tidak ada acara';
			if (matchingEvents.length > 0) {
				eventText = matchingEvents.map((m) => `${m.timeRange ? m.timeRange + ' · ' : ''}${m.title}`).join(', ');
			}

			result.push({
				dayKey: `day-${i}`,
				dayName,
				dateNumber: dateNum,
				eventText,
				isOff: false
			});
		}

		return result;
	});

	// Date range string for current week (e.g. "10–16 November 2026")
	let weekRangeText = $derived.by(() => {
		const now = new Date();
		const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
		const mon = new Date(now);
		mon.setDate(now.getDate() - (dayOfWeek - 1));
		const sun = new Date(mon);
		sun.setDate(mon.getDate() + 6);

		const monthNames = [
			'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
			'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
		];

		if (mon.getMonth() === sun.getMonth()) {
			return `${mon.getDate()}–${sun.getDate()} ${monthNames[mon.getMonth()]} ${mon.getFullYear()}`;
		}
		return `${mon.getDate()} ${monthNames[mon.getMonth()]} – ${sun.getDate()} ${monthNames[sun.getMonth()]} ${sun.getFullYear()}`;
	});
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
	<!-- Left Card: Acara terkonfirmasi -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
				Acara terkonfirmasi
			</h2>
			<span class="text-xs font-mono text-[#6B7280]">
				{events.length} agenda
			</span>
		</div>

		{#if events.length === 0}
			<div class="py-12 text-center text-[#6B7280] space-y-2">
				<div class="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
				<p class="text-xs font-sans font-medium text-[#111111]">Belum ada agenda terkonfirmasi</p>
				<p class="text-[11px] text-[#9CA3AF] max-w-xs mx-auto">
					Agenda dari Google Calendar atau jadwal baru yang Anda buat akan langsung muncul di sini.
				</p>
			</div>
		{:else}
			<div class="space-y-4 pt-1 font-mono text-xs">
				{#each events as ev (ev.id)}
					<div class="space-y-1 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
						<div class="flex items-center justify-between">
							<span class="font-semibold text-[#111111]">{ev.title}</span>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => onSelectEvent?.(ev)}
									class="text-[#374151] hover:text-[#16A34A] transition-colors cursor-pointer"
								>
									{ev.actionLabel || 'Detail ↗'}
								</button>
								{#if onDeleteEvent}
									<button
										type="button"
										title="Batalkan Agenda"
										onclick={() => onDeleteEvent?.(ev.id)}
										class="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
									>
										✕
									</button>
								{/if}
							</div>
						</div>
						<p class="text-[#6B7280]">
							{ev.note || `${ev.dateText || ''} ${ev.timeRange ? '· ' + ev.timeRange : ''}`}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Right Card: Ringkasan Minggu Ini -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
		<div>
			<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
				Ringkasan Minggu Ini
			</h2>
			<p class="text-xs font-mono text-[#6B7280] mt-0.5">
				{weekRangeText}
			</p>
		</div>

		<div class="space-y-3 pt-1 font-mono text-xs">
			{#each weeklyDays as day (day.dayKey)}
				<div class="space-y-0.5">
					<div class="font-semibold text-[#111111]">{day.dayName}</div>
					<div class="{day.eventText !== 'Tidak ada acara' ? 'text-[#16A34A] font-medium' : 'text-[#9CA3AF]'}">
						{day.eventText}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
