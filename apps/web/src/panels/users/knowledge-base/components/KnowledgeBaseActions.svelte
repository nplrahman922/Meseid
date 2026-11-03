<script lang="ts">
	interface Props {
		onAddEntry?: () => void;
		onImportCsv?: () => void;
	}

	let { onAddEntry, onImportCsv }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-3">
	<button
		type="button"
		onclick={onAddEntry}
		class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] transition-colors rounded-xl cursor-pointer shadow-xs"
	>
		Tambah entri
	</button>
	<button
		type="button"
		onclick={onImportCsv}
		class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] hover:bg-[#F3F4F6] transition-colors rounded-xl cursor-pointer"
	>
		Import CSV
	</button>
</div>
