<script lang="ts">
	import type { TrialBalanceItem } from '../keuangan.types';

	interface Props {
		items?: TrialBalanceItem[];
		dateLabel?: string;
	}

	let {
		items = [
			{ id: '1', accountName: 'Kas', debit: 2575000, credit: null },
			{ id: '2', accountName: 'Beban bahan', debit: 125000, credit: null },
			{ id: '3', accountName: 'Modal Owner', debit: null, credit: 1000000 },
			{ id: '4', accountName: 'Pendapatan', debit: null, credit: 1700000 }
		],
		dateLabel = 'Saldo per 16 Oktober 2026 · Seimbang.'
	}: Props = $props();

	function formatRupiah(val: number | null): string {
		if (val === null) return '–';
		return `Rp ${val.toLocaleString('id-ID')}`;
	}

	let totalDebit = $derived(
		items.reduce((sum, i) => sum + (i.debit || 0), 0)
	);
	let totalCredit = $derived(
		items.reduce((sum, i) => sum + (i.credit || 0), 0)
	);
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 shadow-xs">
	<!-- Header -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Neraca Saldo - spesimen
	</h2>

	<!-- Table -->
	<div class="overflow-x-auto border-t border-[#E5E7EB] pt-2">
		<table class="w-full text-left text-xs font-intel">
			<thead class="text-[#6B7280] border-b border-[#E5E7EB]">
				<tr>
					<th class="py-2 px-2 font-normal">Akun</th>
					<th class="py-2 px-2 font-normal text-right">Debit</th>
					<th class="py-2 px-2 font-normal text-right">Kredit</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#each items as item (item.id)}
					<tr class="hover:bg-[#F9FAFB] transition-colors">
						<td class="py-2.5 px-2 font-medium text-[#111111]">{item.accountName}</td>
						<td class="py-2.5 px-2 text-right">{formatRupiah(item.debit)}</td>
						<td class="py-2.5 px-2 text-right">{formatRupiah(item.credit)}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot class="border-t-2 border-[#E5E7EB] bg-[#FAFAFA] font-medium text-[#111111]">
				<tr>
					<td class="py-2.5 px-2 font-intel text-[#6B7280]">Total</td>
					<td class="py-2.5 px-2 text-right">{formatRupiah(totalDebit)}</td>
					<td class="py-2.5 px-2 text-right">{formatRupiah(totalCredit)}</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<!-- Footnote -->
	<p class="text-xs font-inter text-[#0E6B2B]">
		{dateLabel}
	</p>
</div>
