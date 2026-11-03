<script lang="ts">
	import type { CashBookItem } from '../keuangan.types';

	interface Props {
		items?: CashBookItem[];
		finalCashBalance?: number;
		onToggleItem?: (id: string) => void;
	}

	let {
		items = $bindable([
			{ id: '1', date: '16 Okt', description: 'Penjualan teh', type: 'masuk', amount: 450000, isSelected: true },
			{ id: '2', date: '16 Okt', description: 'Belanja bahan', type: 'keluar', amount: 125000, isSelected: false },
			{ id: '3', date: '15 Okt', description: 'Pesanan katering', type: 'masuk', amount: 1250000, isSelected: false }
		]),
		finalCashBalance = 2575000,
		onToggleItem
	}: Props = $props();

	function formatRupiah(val: number): string {
		return `Rp ${val.toLocaleString('id-ID')}`;
	}

	function handleToggle(id: string) {
		items = items.map((i) => (i.id === id ? { ...i, isSelected: !i.isSelected } : i));
		if (onToggleItem) onToggleItem(id);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 shadow-xs">
	<!-- Card Title & Subtitle -->
	<div class="space-y-0.5">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Buku Kas - spesimen
		</h2>
		<p class="text-xs font-intel text-[#6B7280]">
			3 mutasi terakhir dari 4 · Saldo awal sebelum 15 Okt: Rp 1.000.000
		</p>
	</div>

	<!-- Inner Table Container -->
	<div class="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
		<div class="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
			<span class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Mutasi kas terakhir
			</span>
			<span class="text-xs font-intel text-[#0E6B2B] bg-[#E8F9E6] px-2 py-0.5 rounded-full border border-[#C6F0C2]">
				JU-004 dipilih
			</span>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs font-intel">
				<thead class="text-[#6B7280] border-b border-[#E5E7EB] bg-white">
					<tr>
						<th class="py-2.5 px-4 font-normal">Tanggal</th>
						<th class="py-2.5 px-4 font-normal">Keterangan</th>
						<th class="py-2.5 px-4 font-normal">Jenis</th>
						<th class="py-2.5 px-4 font-normal text-right">Nominal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#F3F4F6]">
					{#each items as item (item.id)}
						<tr class="hover:bg-[#F9FAFB] transition-colors">
							<td class="py-3 px-4">
								<div class="flex items-center gap-2.5">
									<input
										type="checkbox"
										checked={item.isSelected}
										onchange={() => handleToggle(item.id)}
										class="w-4 h-4 rounded text-[#0E6B2B] border-[#D1D5DB] focus:ring-[#0E6B2B] cursor-pointer"
									/>
									<span class="text-[#6B7280]">{item.date}</span>
								</div>
							</td>
							<td class="py-3 px-4 font-medium text-[#111111]">
								{item.description}
							</td>
							<td class="py-3 px-4">
								{#if item.type === 'masuk'}
									<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
										Masuk
									</span>
								{:else}
									<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-intel font-normal bg-[#F3F4F6] text-[#6B7280]">
										Keluar
									</span>
								{/if}
							</td>
							<td class="py-3 px-4 text-right font-medium text-[#111111]">
								{formatRupiah(item.amount)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs font-intel text-[#6B7280]">
			<span>3 dari 4 transaksi · 1–16 Okt 2026</span>
			<div class="flex items-center gap-3">
				<button type="button" class="hover:text-[#111111] cursor-pointer">Sebelumnya</button>
				<span class="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#111111]">1</span>
				<button type="button" class="hover:text-[#111111] cursor-pointer">Berikutnya</button>
			</div>
		</div>
	</div>

	<!-- Ending Cash Balance -->
	<div class="pt-2 text-sm font-intel font-medium text-[#111111]">
		Saldo kas akhir: <span class="font-bold text-[#0E6B2B]">{formatRupiah(finalCashBalance)}</span>
	</div>
</div>
