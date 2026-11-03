<script lang="ts">
	import type { JournalEntryItem } from '../keuangan.types';

	interface Props {
		entries?: JournalEntryItem[];
		onViewDetail?: (refCode: string) => void;
	}

	let {
		entries = [
			{
				id: '1',
				date: '01 Okt',
				refCode: 'JU-001',
				debitAccount: 'Kas',
				creditAccount: 'Modal Owner',
				debitAmount: 1000000,
				creditAmount: 1000000
			},
			{
				id: '2',
				date: '15 Okt',
				refCode: 'JU-002',
				debitAccount: 'Kas',
				creditAccount: 'Pendapatan katering',
				debitAmount: 1250000,
				creditAmount: 1250000
			},
			{
				id: '3',
				date: '16 Okt',
				refCode: 'JU-003',
				debitAccount: 'Beban bahan',
				creditAccount: 'Kas',
				debitAmount: 125000,
				creditAmount: 125000
			},
			{
				id: '4',
				date: '16 Okt',
				refCode: 'JU-004',
				debitAccount: 'Kas',
				creditAccount: 'Pendapatan teh',
				debitAmount: 450000,
				creditAmount: 450000
			}
		],
		onViewDetail
	}: Props = $props();

	function formatRupiah(val: number): string {
		return `Rp ${val.toLocaleString('id-ID')}`;
	}

	let totalDebit = $derived(entries.reduce((sum, e) => sum + e.debitAmount, 0));
	let totalCredit = $derived(entries.reduce((sum, e) => sum + e.creditAmount, 0));
	let isBalanced = $derived(totalDebit === totalCredit);
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title & Balance Badge -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Jurnal Umum
		</h2>
		{#if isBalanced}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#1ED10E]"></span>
				Debit = Kredit
			</span>
		{:else}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
				Tidak Seimbang
			</span>
		{/if}
	</div>

	<!-- Subtitle -->
	<p class="text-xs font-inter text-[#6B7280]">
		Periode: 1–16 Oktober 2026 · {entries.length} transaksi · Saldo awal 1 Okt: sebelum mencatat Rp 0
	</p>

	<!-- Journal Table -->
	<div class="overflow-x-auto border-t border-[#E5E7EB] pt-2">
		<table class="w-full text-left text-xs font-intel">
			<thead class="text-[#6B7280] border-b border-[#E5E7EB]">
				<tr>
					<th class="py-2.5 px-3 font-normal">Tanggal</th>
					<th class="py-2.5 px-3 font-normal">Referensi</th>
					<th class="py-2.5 px-3 font-normal">Akun debit / Akun kredit</th>
					<th class="py-2.5 px-3 font-normal text-right">Debit</th>
					<th class="py-2.5 px-3 font-normal text-right">Kredit</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#each entries as item (item.id)}
					<tr class="hover:bg-[#F9FAFB] transition-colors">
						<td class="py-3 px-3 text-[#6B7280]">{item.date}</td>
						<td class="py-3 px-3 font-medium text-[#111111]">{item.refCode}</td>
						<td class="py-3 px-3 text-[#111111]">
							<span class="font-medium">{item.debitAccount}</span>
							<span class="text-[#9CA3AF] mx-1">/</span>
							<span>{item.creditAccount}</span>
						</td>
						<td class="py-3 px-3 text-right font-medium text-[#111111]">{formatRupiah(item.debitAmount)}</td>
						<td class="py-3 px-3 text-right font-medium text-[#111111]">{formatRupiah(item.creditAmount)}</td>
					</tr>
				{/each}
			</tbody>
			<!-- Table Summary -->
			<tfoot class="border-t-2 border-[#E5E7EB] bg-[#FAFAFA] font-medium text-[#111111]">
				<tr>
					<td class="py-3 px-3 font-intel text-[#6B7280]">Total jurnal</td>
					<td class="py-3 px-3 font-intel" colspan="2">
						{entries.length} transaksi · <span class="text-[#0E6B2B]">Debit = Kredit: Rp 0</span>
					</td>
					<td class="py-3 px-3 text-right">{formatRupiah(totalDebit)}</td>
					<td class="py-3 px-3 text-right">{formatRupiah(totalCredit)}</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<!-- Inspector Callout Note & Action -->
	<div class="pt-2 border-t border-[#F3F4F6] space-y-2.5">
		<p class="text-xs font-inter text-[#6B7280] leading-relaxed">
			JU-003: beban bahan dicatat, kas dikredit. Pilih Detail transaksi untuk sumber chat, struk, dan rincian akun.
		</p>
		<button
			type="button"
			onclick={() => onViewDetail?.('JU-003')}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Detail JU-003
		</button>
	</div>
</div>
