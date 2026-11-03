<script lang="ts">
	import type { DocumentItem } from '../dokumen.types';

	interface Props {
		files?: DocumentItem[];
		onViewHistory?: (file: DocumentItem) => void;
	}

	const defaultFiles: DocumentItem[] = [
		{
			id: 'doc-1',
			fileName: 'Laporan Oktober.pdf',
			contentPeriod: 'Laba Rugi · 1-16 Okt 2026',
			latestVersion: 'v3 · 16 Okt, 09.30 WIB',
			fileSize: '248 KB',
			format: 'pdf',
			updatedAt: '16 Okt 2026'
		},
		{
			id: 'doc-2',
			fileName: 'Ringkasan usaha.docx',
			contentPeriod: 'Neraca · per 16 Okt 2026',
			latestVersion: 'v1 · 16 Okt, 09.15 WIB',
			fileSize: '82 KB',
			format: 'word',
			updatedAt: '16 Okt 2026'
		},
		{
			id: 'doc-3',
			fileName: 'Transaksi Oktober.xlsx',
			contentPeriod: 'Jurnal · 1-16 Okt 2026',
			latestVersion: 'v2 · 16 Okt, 09.00 WIB',
			fileSize: '126 KB',
			format: 'excel',
			updatedAt: '16 Okt 2026'
		}
	];

	let { files = defaultFiles, onViewHistory }: Props = $props();
	let selectedHistoryFile = $state<DocumentItem | null>(null);

	function openHistory(item: DocumentItem) {
		selectedHistoryFile = item;
		onViewHistory?.(item);
	}

	function closeHistory() {
		selectedHistoryFile = null;
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6">
	<!-- Title & Filters -->
	<div class="space-y-4">
		<h2 class="text-base sm:text-lg font-semibold text-[#111111]">Semua file</h2>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors"
			>
				Jenis: Semua
			</button>
			<button
				type="button"
				class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors"
			>
				Periode: Oktober 2026
			</button>
		</div>
	</div>

	<!-- Table -->
	<div class="overflow-x-auto">
		<table class="w-full text-left font-mono text-xs">
			<thead>
				<tr class="text-[#374151] border-b border-[#E5E7EB]">
					<th class="py-2.5 pr-4 font-normal">Nama file</th>
					<th class="py-2.5 px-4 font-normal">Isi / Periode</th>
					<th class="py-2.5 px-4 font-normal">Versi terbaru</th>
					<th class="py-2.5 px-4 font-normal">Ukuran</th>
					<th class="py-2.5 pl-4 font-normal">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#F3F4F6]">
				{#each files as file (file.id)}
					<tr class="hover:bg-[#FAFAFA] transition-colors">
						<td class="py-3 pr-4 font-sans text-xs text-[#111111] font-medium">
							{file.fileName}
						</td>
						<td class="py-3 px-4 font-mono text-xs text-[#4B5563]">
							{file.contentPeriod}
						</td>
						<td class="py-3 px-4 font-mono text-xs text-[#4B5563]">
							{file.latestVersion}
						</td>
						<td class="py-3 px-4 font-mono text-xs text-[#4B5563]">
							{file.fileSize}
						</td>
						<td class="py-3 pl-4">
							<button
								type="button"
								onclick={() => openHistory(file)}
								class="text-xs text-[#374151] hover:text-[#16A34A] flex items-center gap-1 transition-colors cursor-pointer"
							>
								<span>Riwayat</span>
								<span>↗</span>
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Quick Action Bottom -->
	<div class="pt-1">
		<button
			type="button"
			onclick={() => openHistory(files[0])}
			class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
		>
			Riwayat Laporan Oktober.pdf
		</button>
	</div>

	<!-- Modal Riwayat Versi -->
	{#if selectedHistoryFile}
		<div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
			<button
				type="button"
				class="fixed inset-0 w-full h-full cursor-default bg-transparent border-0"
				onclick={closeHistory}
				aria-label="Tutup overlay riwayat"
			></button>
			<div
				class="relative z-10 bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-sm font-semibold text-[#111111]">Riwayat Versi Dokumen</h3>
						<p class="text-xs text-[#6B7280] font-mono mt-0.5">{selectedHistoryFile.fileName}</p>
					</div>
					<button
						type="button"
						onclick={closeHistory}
						class="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
					>
						&times;
					</button>
				</div>

				<div class="space-y-3 pt-2 text-xs font-mono">
					<div class="p-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-lg">
						<div class="flex justify-between font-semibold text-[#16A34A]">
							<span>v3 (Terbaru)</span>
							<span>16 Okt, 09.30 WIB</span>
						</div>
						<p class="text-[#374151] font-sans mt-1">Penyesuaian saldo akhir kas dan jurnal umum.</p>
					</div>
					<div class="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg">
						<div class="flex justify-between font-semibold text-[#4B5563]">
							<span>v2</span>
							<span>16 Okt, 09.00 WIB</span>
						</div>
						<p class="text-[#6B7280] font-sans mt-1">Penambahan transaksi belanja bahan Rp 125.000.</p>
					</div>
					<div class="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg">
						<div class="flex justify-between font-semibold text-[#4B5563]">
							<span>v1</span>
							<span>15 Okt, 18.00 WIB</span>
						</div>
						<p class="text-[#6B7280] font-sans mt-1">Draf awal laporan tengah bulan.</p>
					</div>
				</div>

				<div class="pt-2 flex justify-end">
					<button
						type="button"
						onclick={closeHistory}
						class="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151]"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
