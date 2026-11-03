<script lang="ts">
	import type { GoogleIntegrationState } from '../kanal.types';

	interface Props {
		integrationState?: GoogleIntegrationState;
		onManagePermissions?: () => void;
		onRevokeAccess?: () => void;
	}

	let {
		integrationState = $bindable({
			status: 'connected',
			accountEmail: 'rina@contoh.invalid',
			accountType: 'Akun demonstrasi',
			lastSyncedAt: '09.55 WIB',
			calendarEnabled: true,
			driveEnabled: true,
			gmailEnabled: false
		}),
		onManagePermissions,
		onRevokeAccess
	}: Props = $props();

	function toggleCalendar() {
		integrationState.calendarEnabled = !integrationState.calendarEnabled;
	}

	function toggleDrive() {
		integrationState.driveEnabled = !integrationState.driveEnabled;
	}

	function toggleGmail() {
		integrationState.gmailEnabled = !integrationState.gmailEnabled;
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs">
	<!-- Card Title & Status Badge -->
	<div class="flex items-center justify-between">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Google - Izin seperlunya
		</h2>
		<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
			<span class="w-1.5 h-1.5 rounded-full bg-[#1ED10E]"></span>
			Google terhubung
		</span>
	</div>

	<!-- Account Metadata -->
	<div class="text-xs sm:text-sm font-intel text-[#4B5563]">
		{integrationState.accountEmail} · {integrationState.accountType} · Sinkronisasi terakhir {integrationState.lastSyncedAt}
	</div>

	<!-- 3 Columns Services Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Box 1: Google Calendar -->
		<div class="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3">
			<div class="flex items-center justify-between">
				<button
					type="button"
					aria-label="Toggle Google Calendar"
					onclick={toggleCalendar}
					class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {integrationState.calendarEnabled ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
				>
					<span
						class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {integrationState.calendarEnabled ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
					></span>
				</button>
				<div class="text-right">
					<div class="text-xs font-intel font-medium text-[#111111]">Google Calendar</div>
					<div class="text-[11px] font-intel {integrationState.calendarEnabled ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
						{integrationState.calendarEnabled ? 'Aktif' : 'Nonaktif'}
					</div>
				</div>
			</div>
			<p class="text-xs font-inter text-[#4B5563] leading-relaxed">
				Baca dan kelola acara pada kalender usaha yang dipilih.
			</p>
			<p class="text-[11px] font-inter text-[#6B7280] pt-2 border-t border-[#F3F4F6] leading-relaxed">
				Kalender: Warung Bu Rina. Dibatasi untuk jadwal dan catatan bentrok, bukan seluruh kalender pribadi.
			</p>
		</div>

		<!-- Box 2: Google Drive -->
		<div class="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3">
			<div class="flex items-center justify-between">
				<button
					type="button"
					aria-label="Toggle Google Drive"
					onclick={toggleDrive}
					class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {integrationState.driveEnabled ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
				>
					<span
						class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {integrationState.driveEnabled ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
					></span>
				</button>
				<div class="text-right">
					<div class="text-xs font-intel font-medium text-[#111111]">Google Drive</div>
					<div class="text-[11px] font-intel {integrationState.driveEnabled ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
						{integrationState.driveEnabled ? 'Aktif' : 'Nonaktif'}
					</div>
				</div>
			</div>
			<p class="text-xs font-inter text-[#4B5563] leading-relaxed">
				Buat dan akses hanya file yang dibuat atau dipilih melalui Meseid.
			</p>
			<p class="text-[11px] font-inter text-[#6B7280] pt-2 border-t border-[#F3F4F6] leading-relaxed">
				Folder: Meseid / Warung Bu Rina. Tidak meminta akses ke semua isi Drive.
			</p>
		</div>

		<!-- Box 3: Gmail (opsional) -->
		<div class="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-3">
			<div class="flex items-center justify-between">
				<button
					type="button"
					aria-label="Toggle Gmail"
					onclick={toggleGmail}
					class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {integrationState.gmailEnabled ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
				>
					<span
						class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {integrationState.gmailEnabled ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
					></span>
				</button>
				<div class="text-right">
					<div class="text-xs font-intel font-medium text-[#111111]">Gmail (opsional)</div>
					<div class="text-[11px] font-intel {integrationState.gmailEnabled ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
						{integrationState.gmailEnabled ? 'Aktif' : 'Nonaktif'}
					</div>
				</div>
			</div>
			<p class="text-xs font-inter text-[#4B5563] leading-relaxed">
				Kirim laporan dari akun Google atas permintaan Anda.
			</p>
			<p class="text-[11px] font-inter text-[#6B7280] pt-2 border-t border-[#F3F4F6] leading-relaxed">
				Nonaktif. Tidak membaca inbox. Calendar dan Drive tetap tersambung tanpa Gmail.
			</p>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			onclick={onManagePermissions}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Kelola Izin Google
		</button>
		<button
			type="button"
			onclick={onRevokeAccess}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Cabut akses Google
		</button>
	</div>
</div>
