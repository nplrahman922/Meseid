<script lang="ts">
	import type { KnowledgeBaseEntry } from '../knowledge-base.types';

	interface Props {
		entries?: KnowledgeBaseEntry[];
		onEditEntry?: (entry: KnowledgeBaseEntry) => void;
	}

	let {
		entries = [
			{
				id: '1',
				title: 'Teh original',
				category: 'Produk / Harga',
				content: 'Rp 5.000 per gelas',
				updatedAt: '16 Okt · 09.20 WIB'
			},
			{
				id: '2',
				title: 'Jam buka warung',
				category: 'Jam operasional',
				content: 'Sen-Sab 08.00-20.00 WIB; Minggu tutup',
				updatedAt: '15 Okt · 17.00 WIB'
			},
			{
				id: '3',
				title: 'Pesanan katering',
				category: 'Produk',
				content: 'Pesan minimal 1 hari sebelumnya',
				updatedAt: '14 Okt · 10.00 WIB'
			},
			{
				id: '4',
				title: 'Bisa bayar pakai QRIS?',
				category: 'FAQ',
				content: 'Bisa, QRIS tersedia di kasir warung',
				updatedAt: '14 Okt · 09.00 WIB'
			}
		],
		onEditEntry
	}: Props = $props();

	let searchQuery = $state('');
	let selectedCategory = $state('Semua');

	const categories = ['Semua', 'Produk / Harga', 'Jam operasional', 'Produk', 'FAQ'];

	let filteredEntries = $derived(
		entries.filter((entry) => {
			const matchesCategory =
				selectedCategory === 'Semua' || entry.category === selectedCategory;
			const query = searchQuery.toLowerCase().trim();
			const matchesSearch =
				!query ||
				entry.title.toLowerCase().includes(query) ||
				entry.content.toLowerCase().includes(query);
			return matchesCategory && matchesSearch;
		})
	);
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Entri usaha
	</h2>

	<!-- Search Input -->
	<div class="space-y-1.5">
		<label for="kb-search-input" class="block text-xs font-intel font-medium text-[#111111]">
			Cari entri
		</label>
		<input
			id="kb-search-input"
			type="text"
			bind:value={searchQuery}
			placeholder="Cari judul atau jawaban..."
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		/>
	</div>

	<!-- Filter by Category & Summary Bar -->
	<div class="flex flex-wrap items-center justify-between gap-3 pt-1">
		<div class="flex items-center gap-2">
			<label for="kb-category-select" class="sr-only">Pilih Kategori</label>
			<select
				id="kb-category-select"
				bind:value={selectedCategory}
				class="px-3 py-1.5 bg-white border border-[#111111] rounded-xl text-xs font-intel text-[#111111] cursor-pointer focus:outline-none"
			>
				{#each categories as cat}
					<option value={cat}>Kategori: {cat}</option>
				{/each}
			</select>
		</div>
		<div class="text-xs font-intel text-[#6B7280]">
			{filteredEntries.length} entri · Urutan: terbaru diperbarui
		</div>
	</div>

	<!-- Table Area -->
	<div class="overflow-x-auto border-t border-[#E5E7EB] pt-2">
		<table class="w-full text-left text-xs font-intel">
			<thead class="text-[#6B7280] border-b border-[#E5E7EB]">
				<tr>
					<th class="py-2.5 px-3 font-normal">Judul / Pertanyaan</th>
					<th class="py-2.5 px-3 font-normal">Kategori</th>
					<th class="py-2.5 px-3 font-normal">Jawaban / Detail</th>
					<th class="py-2.5 px-3 font-normal">Diperbarui</th>
					<th class="py-2.5 px-3 font-normal text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#if filteredEntries.length === 0}
					<tr>
						<td colspan="5" class="py-8 text-center text-[#9CA3AF] font-intel">
							Tidak ada entri yang cocok dengan pencarian "{searchQuery}".
						</td>
					</tr>
				{:else}
					{#each filteredEntries as item (item.id)}
						<tr class="hover:bg-[#F9FAFB] transition-colors">
							<td class="py-3 px-3 font-medium text-[#111111]">
								{item.title}
							</td>
							<td class="py-3 px-3 text-[#6B7280]">
								{item.category}
							</td>
							<td class="py-3 px-3 text-[#111111] max-w-xs truncate">
								{item.content}
							</td>
							<td class="py-3 px-3 text-[#6B7280] whitespace-nowrap">
								{item.updatedAt}
							</td>
							<td class="py-3 px-3 text-right">
								<button
									type="button"
									onclick={() => onEditEntry?.(item)}
									class="text-[#111111] hover:text-[#0E6B2B] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
								>
									Edit ↗
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Footer Counter -->
	<div class="text-[11px] font-intel text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
		Menampilkan 1–{filteredEntries.length} dari {entries.length} entri · {selectedCategory === 'Semua' ? 'Semua kategori' : selectedCategory}
	</div>
</div>
