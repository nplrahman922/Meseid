<script lang="ts">
	import JadwalHeader from './components/JadwalHeader.svelte';
	import JadwalNavTabs from './components/JadwalNavTabs.svelte';
	import KalenderBulanCard from './components/KalenderBulanCard.svelte';
	import RincianJadwalGrid from './components/RincianJadwalGrid.svelte';
	import PermintaanPembeliSection from './components/PermintaanPembeliSection.svelte';
	import type { CalendarViewMode, ConfirmedEvent } from './jadwal.types';

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

	let currentViewMode = $state<CalendarViewMode>('bulan');
	let toastMessage = $state('');

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	function handleModeChange(mode: CalendarViewMode) {
		currentViewMode = mode;
		showToast(`Beralih ke tampilan kalender ${mode === 'bulan' ? 'Bulanan' : 'Mingguan'}.`);
	}

	function handleAddSchedule() {
		showToast('Membuka formulir tambah jadwal baru...');
	}

	function handleSelectDate(day: number) {
		showToast(`Melihat jadwal untuk tanggal ${day} Oktober 2026.`);
	}

	function handleSelectEvent(event: ConfirmedEvent) {
		showToast(`Membuka rincian: ${event.title}`);
	}

	function handleInquiryAction(id: string, action: string) {
		if (action === 'usul_waktu') {
			showToast('Mengirimkan usulan opsi waktu alternatif ke pembeli...');
		} else if (action === 'setujui' || action === 'setujui_ubah') {
			showToast('Pesanan disetujui dan jadwal terkonfirmasi!');
		} else if (action === 'tolak') {
			showToast('Permintaan pesanan ditolak.');
		}
	}
</script>

<div class="max-w-6xl mx-auto space-y-6 sm:space-y-8">
	<!-- 1. Header & Title -->
	<JadwalHeader {businessName} {role} {dateText} />

	<!-- 2. Nav Tabs & Google Sync Banner -->
	<JadwalNavTabs
		activeMode={currentViewMode}
		{businessName}
		onSelectMode={handleModeChange}
		onAddSchedule={handleAddSchedule}
	/>

	<!-- 3. Monthly Calendar Card -->
	<KalenderBulanCard onSelectDate={handleSelectDate} />

	<!-- 4. Schedule Details Grid (Confirmed Events & Weekly Specimen) -->
	<RincianJadwalGrid onSelectEvent={handleSelectEvent} />

	<!-- 5. Customer Inquiries Section (Order Requests & Collision Warning) -->
	<PermintaanPembeliSection onAction={handleInquiryAction} />

	<!-- Floating Toast Feedback -->
	{#if toastMessage}
		<div class="fixed bottom-6 right-6 z-50 bg-[#111111] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 animate-fade-in font-mono">
			{toastMessage}
		</div>
	{/if}
</div>
