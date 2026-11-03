<script lang="ts">
	import type { DaySchedule } from '../jam-operasional.types';

	interface Props {
		schedules?: DaySchedule[];
		onSave?: () => void;
	}

	let {
		schedules = $bindable([
			{ id: 'mon', dayName: 'Senin', isOpen: true, openTime: '08.00 WIB', closeTime: '20.00 WIB' },
			{ id: 'tue', dayName: 'Selasa', isOpen: true, openTime: '08.00 WIB', closeTime: '20.00 WIB' },
			{ id: 'wed', dayName: 'Rabu', isOpen: true, openTime: '08.00 WIB', closeTime: '20.00 WIB' },
			{ id: 'thu', dayName: 'Kamis', isOpen: true, openTime: '08.00 WIB', closeTime: '20.00 WIB' },
			{ id: 'fri', dayName: 'Jumat', isOpen: true, openTime: '08.00 WIB', closeTime: '20.00 WIB' },
			{ id: 'sat', dayName: 'Sabtu', isOpen: true, openTime: '08.00 WIB', closeTime: '20.00 WIB' },
			{ id: 'sun', dayName: 'Minggu', isOpen: false, openTime: '08.00 WIB', closeTime: '20.00 WIB' }
		]),
		onSave
	}: Props = $props();

	let isSaved = $state(false);

	function toggleDay(id: string) {
		schedules = schedules.map((s) => (s.id === id ? { ...s, isOpen: !s.isOpen } : s));
	}

	function handleSave() {
		isSaved = true;
		if (onSave) onSave();
		setTimeout(() => {
			isSaved = false;
		}, 2500);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Jadwal mingguan
	</h2>

	<!-- 7 Days List -->
	<div class="space-y-3.5">
		{#each schedules as item (item.id)}
			<div class="border border-[#E5E7EB] rounded-xl p-3.5 space-y-3 bg-white">
				<!-- Header Row: Switch & Status -->
				<div class="flex items-center gap-3">
					<button
						type="button"
						aria-label="Toggle hari {item.dayName}"
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
							bind:value={item.openTime}
							class="w-28 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-center text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
						/>
						<span class="text-xs font-inter text-[#6B7280]">sampai</span>
						<input
							type="text"
							bind:value={item.closeTime}
							class="w-28 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-center text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
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

	<!-- Submit Button & Feedback -->
	<div class="flex items-center gap-3 pt-2">
		<button
			type="button"
			onclick={handleSave}
			class="px-5 py-2.5 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] transition-colors rounded-xl cursor-pointer shadow-xs"
		>
			Simpan jam usaha
		</button>
		{#if isSaved}
			<span class="text-xs font-intel text-[#0E6B2B] animate-pulse">
				✓ Jadwal usaha tersimpan
			</span>
		{/if}
	</div>
</div>
