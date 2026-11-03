<script lang="ts">
	import type { ExportRequestStatus } from '../pengaturan.types';

	interface Props {
		onRequestExport?: () => void;
	}

	let { onRequestExport }: Props = $props();

	let exportStatus = $state<ExportRequestStatus>('not_requested');

	function handleRequest() {
		exportStatus = 'processing';
		onRequestExport?.();
		setTimeout(() => {
			exportStatus = 'ready';
		}, 2000);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Minta ekspor data
	</h2>

	<p class="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
		Unduh salinan profil usaha, entri Knowledge Base, transaksi, dan dokumen yang tersimpan pada akun Anda.
	</p>

	<!-- Callout Status -->
	<div class="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3.5 text-xs text-[#166534] leading-relaxed">
		{#if exportStatus === 'not_requested'}
			Permintaan belum dibuat. Setelah diajukan, status kesiapan file muncul di sini. Unduhan hanya tersedia untuk Owner yang terverifikasi.
		{:else if exportStatus === 'processing'}
			Sedang mengumpulkan arsip database dan berkas usaha Anda...
		{:else}
			✓ Berkas arsip ekspor siap diunduh! Tautan kedaluwarsa dalam 24 jam.
		{/if}
	</div>

	<!-- Action Row -->
	<div class="flex flex-wrap items-center gap-3 pt-1">
		<button
			type="button"
			onclick={handleRequest}
			class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
		>
			{exportStatus === 'ready' ? 'Unduh salinan (.zip)' : 'Minta ekspor data'}
		</button>
		<span class="text-xs text-[#6B7280]">
			Ekspor tidak menghapus data atau menghentikan bot.
		</span>
	</div>
</div>
