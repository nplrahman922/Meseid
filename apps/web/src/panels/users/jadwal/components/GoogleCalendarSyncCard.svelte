<script lang="ts">
	import type { GoogleCalendarState } from '../jadwal.types';

	interface Props {
		state: GoogleCalendarState;
		onSync?: () => void;
		isSyncing?: boolean;
	}

	let { state, onSync, isSyncing = false }: Props = $props();

	function connectGoogle() {
		window.location.href = '/api/auth/google?features=calendar&returnUrl=/dashboard?tab=jadwal';
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs transition-all">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<!-- Left: Status & Metadata -->
		<div class="flex items-start sm:items-center gap-3">
			<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 {state.connected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}">
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
					<line x1="16" y1="2" x2="16" y2="6"></line>
					<line x1="8" y1="2" x2="8" y2="6"></line>
					<line x1="3" y1="10" x2="21" y2="10"></line>
				</svg>
			</div>

			<div class="space-y-0.5">
				<div class="flex items-center gap-2">
					<h3 class="text-sm font-semibold text-[#111111]">
						Google Calendar
					</h3>
					{#if state.connected}
						<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
							<span class="w-1.5 h-1.5 rounded-full bg-[#1ED10E]"></span>
							Terhubung
						</span>
					{:else}
						<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
							Belum Terhubung
						</span>
					{/if}
				</div>
				<p class="text-xs text-[#6B7280]">
					{#if state.connected}
						Kalender: <strong>{state.calendarId}</strong> · {state.lastSyncedAt ? `Sinkronisasi terakhir ${new Date(state.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : 'Sinkronisasi otomatis aktif'}
					{:else}
						Hubungkan akun Google Calendar Anda agar agenda dan reservasi pembeli tersinkron dua arah secara otomatis.
					{/if}
				</p>
			</div>
		</div>

		<!-- Right: Actions -->
		<div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
			{#if state.connected}
				<button
					type="button"
					onclick={onSync}
					disabled={isSyncing}
					class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
				>
					<svg class="w-3.5 h-3.5 {isSyncing ? 'animate-spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
					</svg>
					{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
				</button>
			{:else}
				<button
					type="button"
					onclick={connectGoogle}
					class="px-4 py-2 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
				>
					<svg class="w-4 h-4 fill-white" viewBox="0 0 24 24">
						<path d="M12.24 10.285V13.4h6.887C18.2 16.14 15.645 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.81.535 3.845 1.415l2.42-2.42C16.945 3.52 14.735 2.6 12.24 2.6 7.055 2.6 2.85 6.805 2.85 12s4.205 9.4 9.39 9.4c5.42 0 9.035-3.81 9.035-9.195 0-.62-.065-1.22-.185-1.92H12.24z"/>
					</svg>
					Hubungkan Google Calendar
				</button>
			{/if}
		</div>
	</div>
</div>
