<script lang="ts">
	import { onMount } from 'svelte';
	import JamOperasionalHeader from './components/JamOperasionalHeader.svelte';
	import WeeklyScheduleCard from './components/WeeklyScheduleCard.svelte';
	import ScheduleExceptionsCard from './components/ScheduleExceptionsCard.svelte';
	import OutOfHoursReplyCard from './components/OutOfHoursReplyCard.svelte';
	import AddExceptionModal from './components/AddExceptionModal.svelte';
	import { fetchJamOperasional, saveJamOperasional } from './jam-operasional-api.service';
	import type { DaySchedule, ScheduleException, OutOfHoursConfig } from './jam-operasional.types';

	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Usaha Saya',
		userName = 'Owner',
		role = 'Owner',
		dateText = ''
	}: Props = $props();

	let isLoading = $state(true);
	let errorMessage = $state('');
	let toastMessage = $state('');

	let activeTimezone = $state('Asia/Jakarta');
	let adminBotName = $state('Admin Toko');
	let autoReplyEnabled = $state(true);

	let weeklySchedules = $state<DaySchedule[]>([
		{ id: 'mon', dayName: 'Senin', isOpen: true, openTime: '08:00', closeTime: '20:00' },
		{ id: 'tue', dayName: 'Selasa', isOpen: true, openTime: '08:00', closeTime: '20:00' },
		{ id: 'wed', dayName: 'Rabu', isOpen: true, openTime: '08:00', closeTime: '20:00' },
		{ id: 'thu', dayName: 'Kamis', isOpen: true, openTime: '08:00', closeTime: '20:00' },
		{ id: 'fri', dayName: 'Jumat', isOpen: true, openTime: '08:00', closeTime: '20:00' },
		{ id: 'sat', dayName: 'Sabtu', isOpen: true, openTime: '08:00', closeTime: '20:00' },
		{ id: 'sun', dayName: 'Minggu', isOpen: false, openTime: '08:00', closeTime: '20:00' }
	]);

	let scheduleExceptions = $state<ScheduleException[]>([]);
	let outOfHoursConfig = $state<OutOfHoursConfig>({
		isEnabled: true,
		message: ''
	});

	// Modal State
	let isModalOpen = $state(false);
	let editingException = $state<ScheduleException | null>(null);

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	onMount(async () => {
		try {
			isLoading = true;
			const data = await fetchJamOperasional();
			activeTimezone = data.timezone || 'Asia/Jakarta';
			adminBotName = data.admin_bot_name || 'Admin Toko';
			autoReplyEnabled = data.auto_reply_enabled ?? true;

			if (data.business_hours) {
				if (Array.isArray(data.business_hours.weekly) && data.business_hours.weekly.length > 0) {
					weeklySchedules = data.business_hours.weekly;
				}
				scheduleExceptions = data.business_hours.exceptions || [];
				if (data.business_hours.outOfHours) {
					outOfHoursConfig = data.business_hours.outOfHours;
				}
			}
		} catch (err: any) {
			errorMessage = err.message || 'Gagal memuat konfigurasi jam operasional.';
		} finally {
			isLoading = false;
		}
	});

	async function persistAll() {
		try {
			errorMessage = '';
			const updated = await saveJamOperasional({
				business_hours: {
					weekly: weeklySchedules,
					exceptions: scheduleExceptions,
					outOfHours: outOfHoursConfig
				},
				auto_reply_enabled: autoReplyEnabled
			});

			if (updated.business_hours) {
				weeklySchedules = updated.business_hours.weekly;
				scheduleExceptions = updated.business_hours.exceptions || [];
				outOfHoursConfig = updated.business_hours.outOfHours;
			}
		} catch (err: any) {
			errorMessage = err.message || 'Gagal menyimpan perubahan ke server.';
			throw err;
		}
	}

	async function handleSaveWeekly() {
		await persistAll();
		showToast('Jadwal mingguan berhasil disimpan.');
	}

	async function handleSaveOutOfHours() {
		await persistAll();
		showToast('Pengaturan balasan luar jam berhasil disimpan.');
	}

	function handleOpenAddException() {
		editingException = null;
		isModalOpen = true;
	}

	function handleOpenEditException(item: ScheduleException) {
		editingException = item;
		isModalOpen = true;
	}

	async function handleSaveExceptionFromModal(item: ScheduleException) {
		const idx = scheduleExceptions.findIndex((e) => e.id === item.id);
		if (idx >= 0) {
			scheduleExceptions[idx] = item;
		} else {
			scheduleExceptions = [...scheduleExceptions, item];
		}
		try {
			await persistAll();
			showToast('Pengecualian tanggal berhasil diperbarui.');
		} catch {
			// error message is set in persistAll
		}
	}

	async function handleDeleteException(id: string) {
		scheduleExceptions = scheduleExceptions.filter((e) => e.id !== id);
		try {
			await persistAll();
			showToast('Pengecualian tanggal telah dihapus.');
		} catch {
			// error message is set in persistAll
		}
	}
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- 1. Header with Timezone and Operating Policy Banner -->
	<JamOperasionalHeader
		{businessName}
		{userName}
		{role}
		{dateText}
		timezone={activeTimezone}
	/>

	{#if toastMessage}
		<div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-intel rounded-xl animate-in fade-in duration-200">
			✓ {toastMessage}
		</div>
	{/if}

	{#if errorMessage}
		<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-intel rounded-xl animate-in fade-in duration-200">
			⚠️ {errorMessage}
		</div>
	{/if}

	{#if isLoading}
		<div class="p-12 text-center text-xs sm:text-sm font-intel text-[#6B7280] bg-white rounded-2xl border border-[#E5E7EB]">
			Memuat konfigurasi jam operasional toko...
		</div>
	{:else}
		<!-- 2. Two-Column Layout -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
			<!-- Left Column: Weekly Schedule Card (7 Days) -->
			<WeeklyScheduleCard
				bind:schedules={weeklySchedules}
				onSave={handleSaveWeekly}
			/>

			<!-- Right Column: Exceptions & Out-of-hours Reply -->
			<div class="space-y-6">
				<ScheduleExceptionsCard
					exceptions={scheduleExceptions}
					onAddException={handleOpenAddException}
					onEditException={handleOpenEditException}
					onDeleteException={handleDeleteException}
				/>
				<OutOfHoursReplyCard
					bind:config={outOfHoursConfig}
					botName={adminBotName}
					onSave={handleSaveOutOfHours}
				/>
			</div>
		</div>
	{/if}

	<!-- Modal Tambah / Edit Pengecualian Tanggal -->
	<AddExceptionModal
		isOpen={isModalOpen}
		{editingException}
		onClose={() => (isModalOpen = false)}
		onSave={handleSaveExceptionFromModal}
	/>
</div>
