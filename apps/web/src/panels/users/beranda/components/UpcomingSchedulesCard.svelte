<script lang="ts">
	import type { UpcomingScheduleItem } from '../beranda.types';

	interface Props {
		schedules?: UpcomingScheduleItem[];
		conflictWarning?: string;
		onOpenSchedules?: () => void;
	}

	let {
		schedules = [
			{
				id: '1',
				title: 'Ambil katering · Ibu Sari',
				timeRange: 'Sabtu, 17 Okt · 11.00–11.30 WIB',
				statusOrType: 'Dikonfirmasi'
			},
			{
				id: '2',
				title: 'Belanja stok mingguan',
				timeRange: 'Senin, 19 Okt · 08.00–09.00 WIB',
				statusOrType: 'Pengingat Owner'
			}
		],
		conflictWarning = '1 permintaan bentrok perlu ditinjau.',
		onOpenSchedules
	}: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Jadwal mendatang
	</h2>

	<!-- Schedules Grid (2 Columns) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{#each schedules as item (item.id)}
			<div class="space-y-1">
				<div class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
					{item.title}
				</div>
				<div class="text-xs font-inter text-[#6B7280]">
					{item.timeRange} · {item.statusOrType}
				</div>
			</div>
		{/each}
	</div>

	<!-- Bottom Action & Conflict Warning -->
	<div class="flex flex-wrap items-center gap-4 pt-2">
		<button
			type="button"
			onclick={onOpenSchedules}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Buka Jadwal
		</button>
		{#if conflictWarning}
			<span class="text-xs font-inter text-[#6B7280]">
				{conflictWarning}
			</span>
		{/if}
	</div>
</div>
