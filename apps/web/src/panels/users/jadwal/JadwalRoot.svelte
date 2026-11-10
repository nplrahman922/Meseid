<script lang="ts">
	import { onMount } from 'svelte';
	import JadwalHeader from './components/JadwalHeader.svelte';
	import JadwalNavTabs from './components/JadwalNavTabs.svelte';
	import GoogleCalendarSyncCard from './components/GoogleCalendarSyncCard.svelte';
	import KalenderBulanCard from './components/KalenderBulanCard.svelte';
	import RincianJadwalGrid from './components/RincianJadwalGrid.svelte';
	import PermintaanPembeliSection from './components/PermintaanPembeliSection.svelte';
	import AddScheduleModal from './components/AddScheduleModal.svelte';
	import EventDetailModal from './components/EventDetailModal.svelte';
	import type { CalendarViewMode, ConfirmedEvent, OrderInquiry, GoogleCalendarState } from './jadwal.types';
	import {
		fetchGoogleStatus,
		fetchSchedules,
		fetchBookings,
		createSchedule,
		deleteSchedule,
		respondBooking,
		triggerGoogleSync,
	} from './jadwal-api.service';

	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Usaha Anda',
		role = 'Owner',
		dateText = ''
	}: Props = $props();

	let currentViewMode = $state<CalendarViewMode>('bulan');
	let toastMessage = $state('');
	let isAddModalOpen = $state(false);
	let isDetailModalOpen = $state(false);
	let selectedEvent = $state<ConfirmedEvent | null>(null);
	let isSyncing = $state(false);

	let googleState = $state<GoogleCalendarState>({
		connected: false,
		calendarId: 'primary',
		scopes: [],
		hasCalendarScope: false,
		lastSyncedAt: null,
	});

	let confirmedEvents = $state<ConfirmedEvent[]>([]);
	let customerInquiries = $state<OrderInquiry[]>([]);

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3500);
	}

	async function loadAllData() {
		try {
			const [gStatus, scheds, inqs] = await Promise.all([
				fetchGoogleStatus().catch(() => googleState),
				fetchSchedules().catch(() => []),
				fetchBookings().catch(() => []),
			]);
			googleState = gStatus;
			confirmedEvents = scheds;
			customerInquiries = inqs;
		} catch (err: any) {
			console.error('Gagal memuat data jadwal:', err);
		}
	}

	onMount(() => {
		loadAllData();
	});

	async function handleGoogleSync() {
		try {
			isSyncing = true;
			const msg = await triggerGoogleSync();
			showToast(msg);
			await loadAllData();
		} catch (err: any) {
			showToast(`Gagal sinkronisasi: ${err.message}`);
		} finally {
			isSyncing = false;
		}
	}

	async function handleSaveNewSchedule(data: {
		title: string;
		start_at: string;
		end_at: string;
		description?: string;
	}) {
		await createSchedule(data);
		showToast('Jadwal baru berhasil ditambahkan dan disinkronkan ke kalender!');
		await loadAllData();
	}

	async function handleDeleteSchedule(id: string) {
		try {
			await deleteSchedule(id);
			showToast('Jadwal berhasil dibatalkan/dihapus.');
			await loadAllData();
		} catch (err: any) {
			showToast(`Gagal menghapus: ${err.message}`);
		}
	}

	async function handleInquiryAction(id: string, action: string) {
		if (action === 'usul_waktu') {
			showToast('Mengirimkan usulan opsi waktu alternatif ke pembeli...');
			return;
		}

		if (action === 'setujui' || action === 'setujui_ubah') {
			try {
				await respondBooking(id, 'approve');
				showToast('Pesanan disetujui dan jadwal otomatis masuk ke kalender!');
				await loadAllData();
			} catch (err: any) {
				showToast(`Gagal menyetujui: ${err.message}`);
			}
		} else if (action === 'tolak') {
			try {
				await respondBooking(id, 'reject');
				showToast('Permintaan pesanan ditolak.');
				await loadAllData();
			} catch (err: any) {
				showToast(`Gagal menolak: ${err.message}`);
			}
		}
	}
</script>

<div class="max-w-6xl mx-auto space-y-6 sm:space-y-8">
	<!-- 1. Header & Title -->
	<JadwalHeader {businessName} {role} {dateText} />

	<!-- 2. Google Calendar Live Integration Card -->
	<GoogleCalendarSyncCard
		state={googleState}
		onSync={handleGoogleSync}
		{isSyncing}
	/>

	<!-- 3. Nav Tabs & Actions -->
	<JadwalNavTabs
		activeMode={currentViewMode}
		onSelectMode={(mode) => (currentViewMode = mode)}
		onAddSchedule={() => (isAddModalOpen = true)}
	/>

	<!-- 4. Monthly Calendar Card -->
	<KalenderBulanCard
		events={confirmedEvents}
		onSelectDate={(dateStr) => showToast(`Melihat jadwal untuk tanggal ${dateStr}`)}
	/>

	<!-- 5. Schedule Details Grid -->
	<RincianJadwalGrid
		events={confirmedEvents}
		onSelectEvent={(ev) => {
			selectedEvent = ev;
			isDetailModalOpen = true;
		}}
		onDeleteEvent={handleDeleteSchedule}
	/>

	<!-- 6. Customer Inquiries Section -->
	<PermintaanPembeliSection
		inquiries={customerInquiries}
		onAction={handleInquiryAction}
	/>

	<!-- 7. Add Schedule Modal -->
	<AddScheduleModal
		isOpen={isAddModalOpen}
		onClose={() => (isAddModalOpen = false)}
		onSubmit={handleSaveNewSchedule}
	/>

	<!-- 8. Event Detail Modal -->
	<EventDetailModal
		isOpen={isDetailModalOpen}
		event={selectedEvent}
		onClose={() => (isDetailModalOpen = false)}
		onDelete={handleDeleteSchedule}
	/>

	<!-- Floating Toast Feedback -->
	{#if toastMessage}
		<div class="fixed bottom-6 right-6 z-50 bg-[#111111] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 animate-fade-in font-mono">
			{toastMessage}
		</div>
	{/if}
</div>
