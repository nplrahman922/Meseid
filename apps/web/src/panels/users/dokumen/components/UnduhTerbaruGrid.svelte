<script lang="ts">
	import type { RecentDownloadItem } from '../dokumen.types';

	interface Props {
		items?: RecentDownloadItem[];
		onDownload?: (item: RecentDownloadItem) => void;
	}

	const defaultItems: RecentDownloadItem[] = [
		{
			id: 'recent-pdf',
			fileName: 'Laporan Oktober.pdf',
			fileSize: '248 KB',
			updatedAt: '16 Okt 2026',
			version: 'v3',
			format: 'pdf'
		},
		{
			id: 'recent-word',
			fileName: 'Ringkasan usaha.docx',
			fileSize: '82 KB',
			updatedAt: '16 Okt 2026',
			version: 'v1',
			format: 'word'
		},
		{
			id: 'recent-excel',
			fileName: 'Transaksi Oktober.xlsx',
			fileSize: '126 KB',
			updatedAt: '16 Okt 2026',
			version: 'v2',
			format: 'excel'
		}
	];

	let { items = defaultItems, onDownload }: Props = $props();

	function handleDownload(item: RecentDownloadItem) {
		onDownload?.(item);
	}
</script>

<div class="space-y-4">
	<h2 class="text-xl sm:text-2xl font-intel font-normal text-[#111111] tracking-wide">
		Unduh versi terbaru
	</h2>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
		{#each items as item (item.id)}
			<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 flex flex-col justify-between space-y-6">
				<!-- Top row: Icon + Format Badge -->
				<div class="flex items-start justify-between">
					<div class="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.8"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<span class="text-xs font-mono font-medium text-[#16A34A] uppercase">
						{item.format}
					</span>
				</div>

				<!-- Middle: File info -->
				<div class="space-y-1">
					<h3 class="text-sm font-semibold text-[#111111]">
						{item.fileName}
					</h3>
					<p class="text-xs text-[#6B7280]">
						{item.fileSize} · {item.updatedAt} · {item.version}
					</p>
				</div>

				<!-- Bottom: Download action button -->
				<div class="pt-2 border-t border-[#F3F4F6]">
					<button
						type="button"
						onclick={() => handleDownload(item)}
						class="text-xs font-medium text-[#16A34A] hover:text-[#15803D] flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
						<span>Unduh file</span>
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>
