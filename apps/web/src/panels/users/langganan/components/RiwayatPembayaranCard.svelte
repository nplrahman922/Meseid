<script lang="ts">
	import type { PaymentHistoryItem } from '../langganan.types';

	interface Props {
		items?: PaymentHistoryItem[];
		onViewReceipt?: (item: PaymentHistoryItem) => void;
	}

	const defaultItems: PaymentHistoryItem[] = [
		{
			id: 'pay-1',
			orderNumber: 'TOP-DEMO-0920',
			productName: 'Top-up token (bukan Pro)',
			txDate: '20 Sep 2026',
			amount: 20000,
			status: 'Berhasil'
		}
	];

	let { items = defaultItems, onViewReceipt }: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Riwayat pembayaran
	</h2>

	<div class="overflow-x-auto">
		<table class="w-full text-left font-mono text-xs">
			<thead>
				<tr class="text-[#374151] border-b border-[#E5E7EB]">
					<th class="py-2.5 pr-4 font-normal">Pesanan</th>
					<th class="py-2.5 px-4 font-normal">Produk</th>
					<th class="py-2.5 px-4 font-normal">Tanggal</th>
					<th class="py-2.5 px-4 font-normal">Jumlah</th>
					<th class="py-2.5 pl-4 font-normal">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#each items as item (item.id)}
					<tr class="hover:bg-[#FAFAFA] transition-colors">
						<td class="py-3 pr-4 text-[#111111] font-semibold">
							{item.orderNumber}
						</td>
						<td class="py-3 px-4 text-[#4B5563]">
							{item.productName}
						</td>
						<td class="py-3 px-4 text-[#4B5563]">
							{item.txDate}
						</td>
						<td class="py-3 px-4 text-[#111111]">
							Rp {item.amount.toLocaleString('id-ID')}
						</td>
						<td class="py-3 pl-4">
							<button
								type="button"
								onclick={() => onViewReceipt?.(item)}
								class="text-[#374151] hover:text-[#16A34A] flex items-center gap-1 transition-colors cursor-pointer"
							>
								<span>{item.status}</span>
								<span>·</span>
								<span>Bukti ↗</span>
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="text-xs text-[#6B7280] font-mono pt-1">
		Riwayat contoh, bukan bagian jurnal Oktober. Pesanan Pro baru akan tampil setelah checkout.
	</p>
</div>
