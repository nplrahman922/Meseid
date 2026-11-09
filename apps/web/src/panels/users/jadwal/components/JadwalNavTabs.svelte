<script lang="ts">
	import type { CalendarViewMode } from '../jadwal.types';

	interface Props {
		activeMode?: CalendarViewMode;
		businessName?: string;
		onSelectMode?: (mode: CalendarViewMode) => void;
		onAddSchedule?: () => void;
	}

	let {
		activeMode = 'bulan',
		businessName = 'Warung Bu Rina',
		onSelectMode,
		onAddSchedule
	}: Props = $props();

	function handleModeChange(mode: CalendarViewMode) {
		onSelectMode?.(mode);
	}
</script>

<div class="space-y-3">
	<!-- Tab Bar + Action Button -->
	<div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
		<div class="flex items-center gap-8">
			<button
				type="button"
				onclick={() => handleModeChange('bulan')}
				class="text-xs sm:text-sm font-medium transition-colors relative cursor-pointer {activeMode === 'bulan'
					? 'text-[#16A34A] font-semibold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#16A34A]'
					: 'text-[#6B7280] hover:text-[#111111]'}"
			>
				Bulan
			</button>
			<button
				type="button"
				onclick={() => handleModeChange('minggu')}
				class="text-xs sm:text-sm font-medium transition-colors relative cursor-pointer {activeMode === 'minggu'
					? 'text-[#16A34A] font-semibold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#16A34A]'
					: 'text-[#6B7280] hover:text-[#111111]'}"
			>
				Minggu
			</button>
		</div>

		<button
			type="button"
			onclick={onAddSchedule}
			class="px-3.5 sm:px-4 py-2 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
		>
			<span class="text-sm font-bold leading-none">+</span>
			Tambah jadwal
		</button>
	</div>
</div>
