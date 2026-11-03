<script lang="ts">
	import DokumenHeader from './components/DokumenHeader.svelte';
	import BuatLaporanCard from './components/BuatLaporanCard.svelte';
	import SemuaFileTableCard from './components/SemuaFileTableCard.svelte';
	import UnduhTerbaruGrid from './components/UnduhTerbaruGrid.svelte';
	import DriveSyncBanner from './components/DriveSyncBanner.svelte';
	import type { DocumentItem, RecentDownloadItem, ReportType, ExportFormat } from './dokumen.types';

	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();

	let toastMessage = $state('');

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	function handleGenerate(data: { reportType: ReportType; periodText: string; exportFormat: ExportFormat }) {
		showToast(`Membuat file ${data.reportType === 'laba_rugi' ? 'Laba Rugi' : 'Neraca'} format .${data.exportFormat}...`);
	}

	function handleDownload(item: RecentDownloadItem) {
		showToast(`Mengunduh berkas: ${item.fileName}`);
	}
</script>

<div class="max-w-6xl mx-auto space-y-6 sm:space-y-8">
	<!-- 1. Header & Title -->
	<DokumenHeader {businessName} {role} {dateText} />

	<!-- 2. Card Buat Laporan -->
	<BuatLaporanCard onGenerate={handleGenerate} />

	<!-- 3. Card Semua File (Tabel & Riwayat) -->
	<SemuaFileTableCard />

	<!-- 4. Grid Unduh Versi Terbaru -->
	<UnduhTerbaruGrid onDownload={handleDownload} />

	<!-- 5. Banner Status Google Drive & Kanal -->
	<DriveSyncBanner {businessName} />

	<!-- Floating Toast Feedback -->
	{#if toastMessage}
		<div class="fixed bottom-6 right-6 z-50 bg-[#111111] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 animate-fade-in">
			{toastMessage}
		</div>
	{/if}
</div>
