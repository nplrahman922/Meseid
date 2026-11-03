<script lang="ts">
	import type { WeeklyFinanceSummary } from '../beranda.types';

	interface Props {
		summary?: WeeklyFinanceSummary;
		onViewFinance?: () => void;
	}

	let {
		summary = {
			periodLabel: '12–16 Oktober 2026 · minggu berjalan',
			surplus: 1575000,
			totalIncome: 1700000,
			totalExpense: 125000,
			days: [
				{ dayCode: 'Sen', income: 0, expense: 0 },
				{ dayCode: 'Sel', income: 0, expense: 0 },
				{ dayCode: 'Rab', income: 0, expense: 0 },
				{ dayCode: 'Kam', income: 1250000, expense: 0 },
				{ dayCode: 'Jum', income: 450000, expense: 125000 }
			],
			breakdownText: 'Pemasukan: Sen-Rab Rp 0 · Kam Rp 1.250.000 · Jum Rp 450.000'
		},
		onViewFinance
	}: Props = $props();

	function formatRupiah(val: number): string {
		return `Rp ${val.toLocaleString('id-ID')}`;
	}

	// Hitung tinggi proporsional bar terhadap nilai pemasukan tertinggi (Kamis = 1.250.000)
	const maxVal = 1250000;
	function getBarHeight(val: number): string {
		if (val <= 0) return '2px';
		const pct = Math.max(10, Math.round((val / maxVal) * 100));
		return `${pct}%`;
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs flex flex-col justify-between">
	<!-- Header Section -->
	<div class="space-y-1">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Laporan minggu ini
		</h2>
		<p class="text-xs font-inter text-[#6B7280]">
			{summary.periodLabel}
		</p>
	</div>

	<!-- Surplus Figure -->
	<div class="space-y-1">
		<div class="text-2xl sm:text-3xl font-intel font-normal text-[#111111]">
			{formatRupiah(summary.surplus)}
		</div>
		<p class="text-xs font-inter text-[#6B7280]">
			Surplus kas · masuk {formatRupiah(summary.totalIncome)} - keluar {formatRupiah(summary.totalExpense)}
		</p>
	</div>

	<!-- Bar Chart Area (Sen s.d. Jum) -->
	<div class="space-y-2 pt-2">
		<div class="h-28 w-full flex items-end justify-between gap-3 px-2 border-b border-[#E5E7EB]">
			{#each summary.days as d}
				<div class="flex-1 h-full flex flex-col justify-end items-center">
					<div
						class="w-full rounded-t-sm transition-all duration-300 {d.income > 0 ? 'bg-[#5FD068]' : 'bg-[#5FD068]/80'}"
						style="height: {getBarHeight(d.income)};"
						title="{d.dayCode}: {formatRupiah(d.income)}"
					></div>
				</div>
			{/each}
		</div>

		<!-- Day Labels -->
		<div class="w-full flex justify-between gap-3 px-2 text-center text-xs font-inter text-[#6B7280]">
			{#each summary.days as d}
				<div class="flex-1">{d.dayCode}</div>
			{/each}
		</div>
	</div>

	<!-- Breakdown Text -->
	<p class="text-xs font-inter text-[#6B7280] leading-relaxed">
		{summary.breakdownText}
	</p>

	<!-- Action Button -->
	<div>
		<button
			type="button"
			onclick={onViewFinance}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Lihat Keuangan
		</button>
	</div>
</div>
