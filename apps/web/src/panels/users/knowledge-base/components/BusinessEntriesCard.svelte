<script lang="ts">
	import type { KnowledgeBaseEntry } from '../knowledge-base.types';

	interface Props {
		entries?: KnowledgeBaseEntry[];
		isLoading?: boolean;
		onEditEntry?: (entry: KnowledgeBaseEntry) => void;
		onDeleteEntry?: (entry: KnowledgeBaseEntry) => void;
	}

	let {
		entries = [],
		isLoading = false,
		onEditEntry,
		onDeleteEntry
	}: Props = $props();

	let searchQuery = $state('');
	let selectedCategory = $state('Semua');

	let categories = $derived([
		'Semua',
		...Array.from(new Set(entries.map((e) => e.category).filter(Boolean)))
	]);

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

	function formatDate(val?: string): string {
		if (!val) return 'Baru saja';
		try {
			const d = new Date(val);
			if (isNaN(d.getTime())) return val;
			return d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return val;
		}
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title -->
	<div class="flex items-center justify-between">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Entri usaha
		</h2>
		{#if isLoading}
			<span class="text-xs font-inter text-[#0E6B2B] animate-pulse">Memuat data...</span>
		{/if}
	</div>

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
					<th class="py-2.5 px-3 font-normal">Visibilitas</th>
					<th class="py-2.5 px-3 font-normal">Jawaban / Detail</th>
					<th class="py-2.5 px-3 font-normal">Diperbarui</th>
					<th class="py-2.5 px-3 font-normal text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#if filteredEntries.length === 0}
					<tr>
						<td colspan="6" class="py-8 text-center text-[#9CA3AF] font-intel">
							{#if isLoading}
								Sedang mengambil entri knowledge base...
							{:else if searchQuery}
								Tidak ada entri yang cocok dengan pencarian "{searchQuery}".
							{:else}
								Belum ada entri tersimpan. Klik "Tambah entri" untuk memulai.
							{/if}
						</td>
					</tr>
				{:else}
					{#each filteredEntries as item (item.id)}
						<tr class="hover:bg-[#F9FAFB] transition-colors">
							<td class="py-3 px-3 font-medium text-[#111111] max-w-[180px]">
								{item.title}
							</td>
							<td class="py-3 px-3 text-[#6B7280] whitespace-nowrap">
								{item.category}
							</td>
							<td class="py-3 px-3 whitespace-nowrap">
								{#if item.is_internal}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Hanya Asisten Bisnis & Owner">
										🔒 Hanya Asisten
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-50 text-[#0E6B2B] border border-green-200" title="Dapat dijawab ke pelanggan umum">
										✓ Publik
									</span>
								{/if}
							</td>
							<td class="py-3 px-3 text-[#111111] max-w-xs truncate" title={item.content}>
								{item.content}
							</td>
							<td class="py-3 px-3 text-[#6B7280] whitespace-nowrap">
								{formatDate(item.updated_at || item.updatedAt || item.created_at)}
							</td>
							<td class="py-3 px-3 text-right whitespace-nowrap">
								<div class="inline-flex items-center gap-3">
									<button
										type="button"
										onclick={() => onEditEntry?.(item)}
										class="text-[#111111] hover:text-[#0E6B2B] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
									>
										Edit ↗
									</button>
									<button
										type="button"
										onclick={() => onDeleteEntry?.(item)}
										class="text-red-500 hover:text-red-700 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
									>
										Hapus
									</button>
								</div>
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
