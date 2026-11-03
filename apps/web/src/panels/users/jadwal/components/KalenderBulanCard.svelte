<script lang="ts">
	interface Props {
		onSelectDate?: (day: number) => void;
	}

	let { onSelectDate }: Props = $props();

	let currentMonthYear = $state('Oktober 2026');
	let selectedDay = $state(16);

	const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	// Empty offsets for October 2026 (Starts on Thursday / index 3)
	// Days 1..31
	const calendarDays = [
		{ day: null }, { day: null }, { day: null },
		{ day: 1 }, { day: 2 }, { day: 3 }, { day: 4 },
		{ day: 5 }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 }, { day: 10 }, { day: 11 },
		{ day: 12 }, { day: 13 }, { day: 14 }, { day: 15 },
		{ day: 16, isToday: true },
		{ day: 17, hasEvent: true },
		{ day: 18 },
		{ day: 19, hasEvent: true },
		{ day: 20, hasHoliday: true },
		{ day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 },
		{ day: 26 }, { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 }, { day: 31 },
		{ day: null }
	];

	function handleDayClick(day: number) {
		selectedDay = day;
		onSelectDate?.(day);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6">
	<!-- Month Title & Navigation Buttons -->
	<div class="space-y-4">
		<h2 class="text-base sm:text-lg font-semibold text-[#111111] font-sans">
			{currentMonthYear}
		</h2>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors"
			>
				‹ Bulan lalu
			</button>
			<button
				type="button"
				onclick={() => handleDayClick(16)}
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors"
			>
				Hari ini - 16 Okt
			</button>
			<button
				type="button"
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors"
			>
				Bulan depan ›
			</button>
		</div>
	</div>

	<!-- 7-Column Days Table / Grid -->
	<div class="overflow-x-auto">
		<div class="min-w-[420px] font-mono text-sm">
			<!-- Day Names Header -->
			<div class="grid grid-cols-7 text-left text-xs text-[#374151] pb-3 border-b border-[#F3F4F6]">
				{#each dayHeaders as d}
					<div class="py-1">{d}</div>
				{/each}
			</div>

			<!-- Dates Grid -->
			<div class="grid grid-cols-7 gap-y-3 pt-3 text-left">
				{#each calendarDays as item, idx (idx)}
					{#if item.day === null}
						<div class="py-1.5 text-gray-300"></div>
					{:else}
						<button
							type="button"
							onclick={() => item.day && handleDayClick(item.day)}
							class="py-1.5 text-left transition-colors flex items-center gap-1 cursor-pointer group"
						>
							{#if item.isToday}
								<span class="font-semibold text-[#111111] group-hover:text-[#16A34A]">
									[{item.day}]
								</span>
							{:else}
								<span class="text-[#374151] group-hover:text-[#16A34A] {selectedDay === item.day ? 'font-semibold text-[#16A34A]' : ''}">
									{item.day}
								</span>
							{/if}

							{#if item.hasEvent || item.hasHoliday}
								<span class="w-1.5 h-1.5 rounded-full {item.hasHoliday ? 'bg-amber-500' : 'bg-[#111111]'}"></span>
							{/if}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	<!-- Legend / Footnote -->
	<div class="pt-2 border-t border-[#F3F4F6] text-xs font-mono text-[#6B7280]">
		[16] = hari ini • 17 ambil katering • 19 belanja stok • 20 pengecualian libur. Rincian waktu di bawah.
	</div>
</div>
