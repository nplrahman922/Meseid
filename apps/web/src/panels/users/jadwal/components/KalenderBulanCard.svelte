<script lang="ts">
	import type { ConfirmedEvent } from '../jadwal.types';

	interface Props {
		events?: ConfirmedEvent[];
		onSelectDate?: (dateStr: string) => void;
	}

	let { events = [], onSelectDate }: Props = $props();

	let activeDate = $state(new Date());
	let selectedDay = $state(new Date().getDate());

	const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	const monthNames = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];

	let currentYear = $derived(activeDate.getFullYear());
	let currentMonth = $derived(activeDate.getMonth());
	let currentMonthYearText = $derived(`${monthNames[currentMonth]} ${currentYear}`);

	const today = new Date();
	let isCurrentMonthActual = $derived(
		today.getFullYear() === currentYear && today.getMonth() === currentMonth
	);

	let calendarCells = $derived.by(() => {
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		// Day of week in JS: 0=Sun, 1=Mon, ..., 6=Sat
		// Convert to Mon=0, Tue=1, ..., Sun=6
		const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
		const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

		const cells: {
			day: number | null;
			isToday?: boolean;
			hasEvent?: boolean;
			dateStr?: string;
		}[] = [];

		// Leading empty offsets
		for (let i = 0; i < startOffset; i++) {
			cells.push({ day: null });
		}

		// Days of month
		for (let d = 1; d <= totalDays; d++) {
			const isToday = isCurrentMonthActual && d === today.getDate();
			const dayPad = String(d).padStart(2, '0');
			const monthPad = String(currentMonth + 1).padStart(2, '0');
			const dateStr = `${currentYear}-${monthPad}-${dayPad}`;

			// Check if any event falls on this date
			const hasEvent = events.some((ev) => {
				if (!ev.dateText) return false;
				const evLower = ev.dateText.toLowerCase();
				return evLower.includes(String(d)) || ev.title?.toLowerCase().includes(String(d));
			});

			cells.push({ day: d, isToday, hasEvent, dateStr });
		}

		return cells;
	});

	function prevMonth() {
		activeDate = new Date(currentYear, currentMonth - 1, 1);
	}

	function nextMonth() {
		activeDate = new Date(currentYear, currentMonth + 1, 1);
	}

	function resetToToday() {
		activeDate = new Date();
		selectedDay = today.getDate();
		handleDayClick(today.getDate());
	}

	function handleDayClick(day: number) {
		selectedDay = day;
		const dayPad = String(day).padStart(2, '0');
		const monthPad = String(currentMonth + 1).padStart(2, '0');
		onSelectDate?.(`${currentYear}-${monthPad}-${dayPad}`);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6">
	<!-- Month Title & Navigation Buttons -->
	<div class="space-y-4">
		<h2 class="text-base sm:text-lg font-semibold text-[#111111] font-sans">
			{currentMonthYearText}
		</h2>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={prevMonth}
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
			>
				‹ Bulan lalu
			</button>
			<button
				type="button"
				onclick={resetToToday}
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
			>
				Hari ini - {today.getDate()} {monthNames[today.getMonth()].slice(0, 3)}
			</button>
			<button
				type="button"
				onclick={nextMonth}
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
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
				{#each calendarCells as item, idx (idx)}
					{#if item.day === null}
						<div class="py-1.5 text-gray-300"></div>
					{:else}
						<button
							type="button"
							onclick={() => item.day && handleDayClick(item.day)}
							class="py-1.5 text-left transition-colors flex items-center gap-1 cursor-pointer group"
						>
							{#if item.isToday}
								<span class="font-semibold text-[#111111] group-hover:text-[#16A34A] {selectedDay === item.day ? 'underline' : ''}">
									[{item.day}]
								</span>
							{:else}
								<span class="text-[#374151] group-hover:text-[#16A34A] {selectedDay === item.day ? 'font-semibold text-[#16A34A]' : ''}">
									{item.day}
								</span>
							{/if}

							{#if item.hasEvent}
								<span class="w-1.5 h-1.5 rounded-full bg-[#111111]"></span>
							{/if}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	<!-- Legend / Footnote -->
	<div class="pt-2 border-t border-[#F3F4F6] text-xs font-mono text-[#6B7280]">
		[{today.getDate()}] = Hari ini • Titik hitam = Ada agenda terkonfirmasi.
	</div>
</div>
