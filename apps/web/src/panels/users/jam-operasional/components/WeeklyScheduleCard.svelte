<script lang="ts">
	import type { DaySchedule } from '../jam-operasional.types';

	interface Props {
		schedules?: DaySchedule[];
		is24Hours?: boolean;
		onSave?: () => Promise<void> | void;
	}

	let {
		schedules = $bindable([]),
		is24Hours = $bindable(true),
		onSave
	}: Props = $props();

	let isSaving = $state(false);
	let isSaved = $state(false);

	function toggleDay(id: string) {
		if (is24Hours) return;
		schedules = schedules.map((s) => (s.id === id ? { ...s, isOpen: !s.isOpen } : s));
	}

	function toggle24Hours() {
		is24Hours = !is24Hours;
	}

	async function handleSave() {
		if (isSaving) return;
		isSaving = true;
		try {
			if (onSave) await onSave();
			isSaved = true;
			setTimeout(() => {
				isSaved = false;
			}, 2500);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title & Status Badge -->
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Jadwal mingguan
		</h2>
		{#if is24Hours}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-intel font-medium bg-emerald-50 text-[#0E6B2B] border border-emerald-200">
				<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
				Buka 24 Jam Nonstop
			</span>
		{:else}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-intel font-medium bg-gray-50 text-gray-700 border border-gray-200">
				Jadwal Khusus
			</span>
		{/if}
	</div>

	<!-- Relative Wrapper: 7 Days List with Blur Overlay when 24h is active -->
	<div class="relative rounded-2xl overflow-hidden">
		<!-- 7 Days List (Blurred & Disabled when is24Hours) -->
		<div class="space-y-3.5 transition-all duration-300 {is24Hours ? 'blur-[3px] opacity-35 select-none pointer-events-none grayscale-[30%]' : ''}">
			{#each schedules as item (item.id)}
				<div class="border border-[#E5E7EB] rounded-xl p-3.5 space-y-3 bg-white">
					<!-- Header Row: Switch & Status -->
					<div class="flex items-center gap-3">
						<button
							type="button"
							aria-label="Toggle hari {item.dayName}"
							disabled={is24Hours}
							onclick={() => toggleDay(item.id)}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {item.isOpen ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
						>
							<span
								class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {item.isOpen ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
							></span>
						</button>
						<div>
							<div class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
								{item.dayName} · {item.isOpen ? 'Buka' : 'Tutup'}
							</div>
							<div class="text-[11px] font-intel {item.isOpen ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
								{item.isOpen ? 'Aktif' : 'Nonaktif'}
							</div>
						</div>
					</div>

					<!-- Time Inputs Row or Closed Note -->
					{#if item.isOpen}
						<div class="flex items-center gap-3 pt-1">
							<input
								type="text"
								disabled={is24Hours}
								bind:value={item.openTime}
								placeholder="08:00"
								class="w-28 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-center text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B] disabled:bg-gray-100 disabled:text-gray-400"
							/>
							<span class="text-xs font-inter text-[#6B7280]">sampai</span>
							<input
								type="text"
								disabled={is24Hours}
								bind:value={item.closeTime}
								placeholder="20:00"
								class="w-28 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-center text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B] disabled:bg-gray-100 disabled:text-gray-400"
							/>
						</div>
					{:else}
						<p class="text-xs font-inter text-[#6B7280] pt-1">
							Tidak menerima layanan manusia pada hari {item.dayName}.
						</p>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Lock Overlay Badge (Shown when is24Hours is true) -->
		{#if is24Hours}
			<div class="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/40 backdrop-blur-[1px] rounded-2xl animate-in fade-in duration-200">
				<div class="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] shadow-md flex items-center justify-center text-[#0E6B2B] mb-3">
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
				<h3 class="text-sm font-intel font-semibold text-[#111111] mb-1">
					Mode Buka 24 Jam Aktif
				</h3>
				<p class="text-xs font-inter text-[#6B7280] max-w-xs leading-relaxed mb-3">
					Jadwal mingguan tidak dibatasi. Bot AI asisten melayani pelanggan sepanjang waktu 24/7 tanpa pemotongan jam operasional.
				</p>
				<button
					type="button"
					onclick={toggle24Hours}
					class="px-3.5 py-1.5 text-xs font-intel font-medium text-[#0E6B2B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
				>
					Buka Gembok & Atur Jam Khusus
				</button>
			</div>
		{/if}
	</div>

	<!-- Toggle Switch Mode 24 Jam -->
	<div class="flex items-center justify-between p-3.5 sm:p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
		<div class="space-y-0.5 pr-3">
			<div class="text-xs sm:text-sm font-intel font-medium text-[#111111] flex items-center gap-1.5">
				<span>Buka 24 Jam Nonstop</span>
				{#if is24Hours}
					<span class="w-2 h-2 rounded-full bg-[#1ED10E]"></span>
				{/if}
			</div>
			<p class="text-[11px] font-inter text-[#6B7280] leading-normal">
				{#if is24Hours}
					Toko selalu aktif. Matikan switch ini jika ingin membatasi jam buka Senin-Minggu.
				{:else}
					Jadwal harian aktif. Nyalakan switch ini untuk membuka toko 24 jam nonstop.
				{/if}
			</p>
		</div>
		<button
			type="button"
			role="switch"
			aria-checked={is24Hours}
			aria-label="Toggle Buka 24 Jam Nonstop"
			onclick={toggle24Hours}
			class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {is24Hours ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
		>
			<span
				class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 {is24Hours ? 'translate-x-6' : 'translate-x-1'}"
			></span>
		</button>
	</div>

	<!-- Submit Button & Feedback -->
	<div class="flex items-center gap-3 pt-1">
		<button
			type="button"
			disabled={isSaving}
			onclick={handleSave}
			class="px-5 py-2.5 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] disabled:opacity-50 transition-colors rounded-xl cursor-pointer shadow-xs"
		>
			{isSaving ? 'Menyimpan...' : 'Simpan jam usaha'}
		</button>
		{#if isSaved}
			<span class="text-xs font-intel text-[#0E6B2B] animate-pulse">
				✓ Jam usaha berhasil disimpan
			</span>
		{/if}
	</div>
</div>
