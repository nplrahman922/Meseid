<script lang="ts">
	import type { SubledgerItem } from '../keuangan.types';

	interface Props {
		items?: SubledgerItem[];
	}

	let {
		items = [
			{ id: '1', type: 'Utang', unpaidAmount: 0, note: 'Tidak ada kewajiban tercatat' },
			{ id: '2', type: 'Piutang', unpaidAmount: 0, note: 'Semua penjualan contoh dibayar tunai' }
		]
	}: Props = $props();

	function formatRupiah(val: number): string {
		return `Rp ${val.toLocaleString('id-ID')}`;
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Utang/Piutang - spesimen
	</h2>

	<!-- Table -->
	<div class="overflow-x-auto border-t border-[#E5E7EB] pt-2">
		<table class="w-full text-left text-xs font-intel">
			<thead class="text-[#6B7280] border-b border-[#E5E7EB]">
				<tr>
					<th class="py-2.5 px-3 font-normal">Jenis</th>
					<th class="py-2.5 px-3 font-normal text-right">Belum lunas</th>
					<th class="py-2.5 px-3 font-normal pl-8">Keterangan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#each items as item (item.id)}
					<tr class="hover:bg-[#F9FAFB] transition-colors">
						<td class="py-3 px-3 font-medium text-[#111111]">{item.type}</td>
						<td class="py-3 px-3 text-right font-medium text-[#111111]">{formatRupiah(item.unpaidAmount)}</td>
						<td class="py-3 px-3 text-[#6B7280] pl-8">{item.note}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
