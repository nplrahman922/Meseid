<script lang="ts">
	import type { ConfirmedEvent, WeeklyDaySchedule } from '../jadwal.types';

	interface Props {
		onSelectEvent?: (event: ConfirmedEvent) => void;
	}

	let { onSelectEvent }: Props = $props();

	const confirmedEvents: ConfirmedEvent[] = [
		{
			id: 'ev-1',
			title: 'Sabtu, 17 Okt · Ambil katering',
			dateText: 'Sabtu, 17 Okt',
			timeRange: '11.00–11.30 WIB',
			customerName: 'Ibu Sari',
			note: '11.00–11.30 WIB · Ibu Sari · Pesanan telah dibayar 15 Okt',
			type: 'order',
			actionLabel: 'Detail ↗'
		},
		{
			id: 'ev-2',
			title: 'Senin, 19 Okt · Belanja stok',
			dateText: 'Senin, 19 Okt',
			timeRange: '08.00–09.00 WIB',
			note: '08.00–09.00 WIB · Pengingat Owner',
			type: 'reminder',
			actionLabel: 'Detail ↗'
		},
		{
			id: 'ev-3',
			title: 'Selasa, 20 Okt · Tutup',
			dateText: 'Selasa, 20 Okt',
			timeRange: 'Sepanjang hari',
			note: 'Pengecualian jam usaha · Libur keluarga',
			type: 'holiday',
			actionLabel: 'Edit ↗'
		}
	];

	const weeklyDays: WeeklyDaySchedule[] = [
		{ dayKey: 'sen', dayName: 'Sen 12', dateNumber: 12, eventText: 'Tidak ada acara' },
		{ dayKey: 'sel', dayName: 'Sel 13', dateNumber: 13, eventText: 'Tidak ada acara' },
		{ dayKey: 'rab', dayName: 'Rab 14', dateNumber: 14, eventText: 'Tidak ada acara' },
		{ dayKey: 'kam', dayName: 'Kam 15', dateNumber: 15, eventText: 'Tidak ada acara' },
		{ dayKey: 'jum', dayName: 'Jum 16', dateNumber: 16, eventText: 'Tidak ada acara' },
		{
			dayKey: 'sab',
			dayName: 'Sab 17',
			dateNumber: 17,
			eventText: '11.00–11.30 WIB · Ambil katering / Ibu Sari'
		},
		{
			dayKey: 'min',
			dayName: 'Min 18',
			dateNumber: 18,
			eventText: 'Warung tutup · Minggu',
			isOff: true
		}
	];
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
	<!-- Left Card: Acara terkonfirmasi -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
		<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
			Acara terkonfirmasi
		</h2>

		<div class="space-y-4 pt-1 font-mono text-xs">
			{#each confirmedEvents as ev (ev.id)}
				<div class="space-y-1 pb-3 border-b border-[#F3F4F6] last:border-0 last:pb-0">
					<div class="flex items-center justify-between">
						<span class="font-semibold text-[#111111]">{ev.title}</span>
						<button
							type="button"
							onclick={() => onSelectEvent?.(ev)}
							class="text-[#374151] hover:text-[#16A34A] transition-colors cursor-pointer"
						>
							{ev.actionLabel || 'Detail ↗'}
						</button>
					</div>
					<p class="text-[#6B7280]">
						{ev.note}
					</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Right Card: Minggu · spesimen -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
		<div>
			<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
				Minggu · spesimen
			</h2>
			<p class="text-xs font-mono text-[#9CA3AF] mt-0.5">
				12–18 Oktober 2026 · Bukan tampilan aktif
			</p>
		</div>

		<div class="space-y-3 pt-1 font-mono text-xs">
			{#each weeklyDays as day (day.dayKey)}
				<div class="space-y-0.5">
					<div class="font-semibold text-[#111111]">{day.dayName}</div>
					<div class="{day.isOff ? 'text-[#9CA3AF]' : 'text-[#4B5563]'}">
						{day.eventText}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
