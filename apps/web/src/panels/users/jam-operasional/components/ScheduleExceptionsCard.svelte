<script lang="ts">
	import type { ScheduleException } from '../jam-operasional.types';

	interface Props {
		exceptions?: ScheduleException[];
		onAddException?: () => void;
		onEditException?: (item: ScheduleException) => void;
		onDeleteException?: (id: string) => void;
	}

	let {
		exceptions = [],
		onAddException,
		onEditException,
		onDeleteException
	}: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Pengecualian tanggal
	</h2>

	<!-- Exceptions List -->
	{#if exceptions.length > 0}
		<div class="space-y-3">
			{#each exceptions as item (item.id)}
				<div class="space-y-1 pb-3 border-b border-[#F3F4F6] last:border-b-0 last:pb-0">
					<div class="flex items-center justify-between text-xs sm:text-sm font-intel font-medium text-[#111111]">
						<div class="flex items-center gap-2">
							<span>{item.dateLabel}</span>
							<span class="text-[#9CA3AF]">/</span>
							<button
								type="button"
								onclick={() => onEditException?.(item)}
								class="text-[#111111] hover:text-[#0E6B2B] hover:underline cursor-pointer"
							>
								Edit ↗
							</button>
						</div>
						<button
							type="button"
							aria-label="Hapus Pengecualian"
							onclick={() => onDeleteException?.(item.id)}
							class="text-[#9CA3AF] hover:text-red-600 transition-colors cursor-pointer text-xs"
						>
							Hapus
						</button>
					</div>
					<div class="text-xs font-inter text-[#6B7280]">
						{item.reason}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-xs font-inter text-[#6B7280] py-1">
			Belum ada jadwal khusus atau hari libur yang ditetapkan.
		</p>
	{/if}

	<!-- Action Button -->
	<div>
		<button
			type="button"
			onclick={onAddException}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Tambah pengecualian
		</button>
	</div>

	<!-- Footnote -->
	<p class="text-[11px] font-inter text-[#6B7280]">
		Pengecualian menggantikan jadwal mingguan hanya pada tanggal tersebut.
	</p>
</div>
