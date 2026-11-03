<script lang="ts">
	interface Props {
		periodLabel?: string;
		onFilterPeriod?: () => void;
		onAddTransaction?: () => void;
		onExportExcel?: () => void;
	}

	let {
		periodLabel = '1–16 Okt 2026',
		onFilterPeriod,
		onAddTransaction,
		onExportExcel
	}: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-3">
	<!-- Period Filter Button -->
	<button
		type="button"
		onclick={onFilterPeriod}
		class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] hover:bg-[#F3F4F6] transition-colors rounded-xl cursor-pointer"
	>
		{periodLabel}
	</button>

	<!-- Add Transaction Button -->
	<button
		type="button"
		onclick={onAddTransaction}
		class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] transition-colors rounded-xl cursor-pointer shadow-xs"
	>
		Tambah transaksi
	</button>

	<!-- Export Excel Button -->
	<button
		type="button"
		onclick={onExportExcel}
		class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] hover:bg-[#F3F4F6] transition-colors rounded-xl cursor-pointer"
	>
		Export Excel
	</button>
</div>
