<script lang="ts">
	import type { MetricsSummary } from '../beranda.types';

	interface Props {
		metrics?: MetricsSummary;
	}

	let {
		metrics = {
			transactionsCount: 4,
			transactionsVerified: 4,
			cashBalance: 2575000,
			initialCash: 1000000,
			messagesCount: 24,
			messagesChannels: 'WhatsApp & Telegram',
			remainingTokens: 6400,
			remainingTokensPercent: 64,
			periodLabel: '1–16 Oktober 2026'
		}
	}: Props = $props();

	function formatRupiah(val: number): string {
		return `Rp ${val.toLocaleString('id-ID')}`;
	}
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
	<!-- Card 1: Transaksi bulan ini -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col justify-between space-y-4 shadow-xs">
		<div class="flex items-center justify-between">
			<span class="text-xs font-intel text-[#6B7280]">Transaksi bulan ini</span>
			<span class="text-[#0E6B2B] text-base font-bold">↗</span>
		</div>
		<div class="space-y-1">
			<div class="text-xl sm:text-2xl font-intel font-normal text-[#111111]">
				{metrics.transactionsCount} transaksi
			</div>
			<div class="text-xs font-intel text-[#0E6B2B]">
				{metrics.transactionsVerified} catatan terverifikasi
			</div>
		</div>
		<div class="text-[11px] font-intel text-[#9CA3AF] pt-2 border-t border-[#F3F4F6]">
			{metrics.periodLabel}
		</div>
	</div>

	<!-- Card 2: Saldo kas -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col justify-between space-y-4 shadow-xs">
		<div class="flex items-center justify-between">
			<span class="text-xs font-intel text-[#6B7280]">Saldo kas</span>
			<span class="text-[#0E6B2B] text-base font-bold">↗</span>
		</div>
		<div class="space-y-1">
			<div class="text-xl sm:text-2xl font-intel font-normal text-[#111111]">
				{formatRupiah(metrics.cashBalance)}
			</div>
			<div class="text-xs font-intel text-[#0E6B2B]">
				Awal {formatRupiah(metrics.initialCash)}
			</div>
		</div>
		<div class="text-[11px] font-intel text-[#9CA3AF] pt-2 border-t border-[#F3F4F6]">
			{metrics.periodLabel}
		</div>
	</div>

	<!-- Card 3: Pesan hari ini -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col justify-between space-y-4 shadow-xs">
		<div class="flex items-center justify-between">
			<span class="text-xs font-intel text-[#6B7280]">Pesan hari ini</span>
			<span class="text-[#0E6B2B] text-base font-bold">↗</span>
		</div>
		<div class="space-y-1">
			<div class="text-xl sm:text-2xl font-intel font-normal text-[#111111]">
				{metrics.messagesCount} pesan
			</div>
			<div class="text-xs font-intel text-[#0E6B2B]">
				{metrics.messagesChannels}
			</div>
		</div>
		<div class="text-[11px] font-intel text-[#9CA3AF] pt-2 border-t border-[#F3F4F6]">
			{metrics.periodLabel}
		</div>
	</div>

	<!-- Card 4: Sisa kuota token -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col justify-between space-y-4 shadow-xs">
		<div class="flex items-center justify-between">
			<span class="text-xs font-intel text-[#6B7280]">Sisa kuota token</span>
			<span class="text-[#0E6B2B] text-base font-bold">↗</span>
		</div>
		<div class="space-y-1">
			<div class="text-xl sm:text-2xl font-intel font-normal text-[#111111]">
				{metrics.remainingTokens.toLocaleString('id-ID')} token
			</div>
			<div class="text-xs font-intel text-[#0E6B2B]">
				{metrics.remainingTokensPercent}% tersisa · ilustrasi
			</div>
		</div>
		<div class="text-[11px] font-intel text-[#9CA3AF] pt-2 border-t border-[#F3F4F6]">
			{metrics.periodLabel}
		</div>
	</div>
</div>
