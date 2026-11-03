<script lang="ts">
	import type { GeneralLedgerItem } from '../keuangan.types';

	interface Props {
		accountTitle?: string;
		items?: GeneralLedgerItem[];
	}

	let {
		accountTitle = 'Akun 101 - Kas',
		items = [
			{ id: '1', refCode: 'JU-001', changeAmount: 1000000, runningBalance: 1000000 },
			{ id: '2', refCode: 'JU-002', changeAmount: 1250000, runningBalance: 2250000 },
			{ id: '3', refCode: 'JU-003', changeAmount: -125000, runningBalance: 2125000 },
			{ id: '4', refCode: 'JU-004', changeAmount: 450000, runningBalance: 2575000 }
		]
	}: Props = $props();

	function formatRupiah(val: number): string {
		return `Rp ${Math.abs(val).toLocaleString('id-ID')}`;
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 shadow-xs">
	<!-- Header -->
	<div class="space-y-0.5">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Buku Besar - spesimen
		</h2>
		<p class="text-xs font-intel text-[#6B7280]">
			{accountTitle}
		</p>
	</div>

	<!-- Table -->
	<div class="overflow-x-auto border-t border-[#E5E7EB] pt-2">
		<table class="w-full text-left text-xs font-intel">
			<thead class="text-[#6B7280] border-b border-[#E5E7EB]">
				<tr>
					<th class="py-2 px-2 font-normal">Referensi</th>
					<th class="py-2 px-2 font-normal text-right">Mutasi</th>
					<th class="py-2 px-2 font-normal text-right">Saldo</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#each items as item (item.id)}
					<tr class="hover:bg-[#F9FAFB] transition-colors">
						<td class="py-2.5 px-2 font-medium text-[#111111]">{item.refCode}</td>
						<td class="py-2.5 px-2 text-right {item.changeAmount >= 0 ? 'text-[#0E6B2B]' : 'text-[#EF4444]'}">
							{item.changeAmount >= 0 ? '+' : '-'} {formatRupiah(item.changeAmount)}
						</td>
						<td class="py-2.5 px-2 text-right font-medium text-[#111111]">{formatRupiah(item.runningBalance)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
