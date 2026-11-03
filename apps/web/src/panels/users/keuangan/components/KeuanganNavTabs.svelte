<script lang="ts">
	import type { FinancialReportTab } from '../keuangan.types';

	interface Props {
		activeTab?: FinancialReportTab;
		onSelectTab?: (tab: FinancialReportTab) => void;
	}

	let { activeTab = 'jurnal', onSelectTab }: Props = $props();

	function handleTab(tab: FinancialReportTab) {
		if (onSelectTab) {
			onSelectTab(tab);
		}
	}
</script>

<div class="space-y-2 border-b border-[#E5E7EB] pb-2 text-xs sm:text-sm font-intel">
	<!-- Row 1: Jurnal Umum, Buku Besar, Neraca Saldo -->
	<div class="flex flex-wrap items-center gap-6">
		<button
			type="button"
			onclick={() => handleTab('jurnal')}
			class="pb-1 transition-colors cursor-pointer {activeTab === 'jurnal'
				? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
				: 'text-[#6B7280] hover:text-[#111111]'}"
		>
			Jurnal Umum
		</button>
		<button
			type="button"
			onclick={() => handleTab('buku-besar')}
			class="pb-1 transition-colors cursor-pointer {activeTab === 'buku-besar'
				? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
				: 'text-[#6B7280] hover:text-[#111111]'}"
		>
			Buku Besar
		</button>
		<button
			type="button"
			onclick={() => handleTab('neraca')}
			class="pb-1 transition-colors cursor-pointer {activeTab === 'neraca'
				? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
				: 'text-[#6B7280] hover:text-[#111111]'}"
		>
			Neraca Saldo
		</button>
	</div>

	<!-- Row 2: Buku Kas, Utang/Piutang -->
	<div class="flex flex-wrap items-center gap-6 pt-1">
		<button
			type="button"
			onclick={() => handleTab('buku-kas')}
			class="pb-1 transition-colors cursor-pointer {activeTab === 'buku-kas'
				? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
				: 'text-[#6B7280] hover:text-[#111111]'}"
		>
			Buku Kas
		</button>
		<button
			type="button"
			onclick={() => handleTab('utang-piutang')}
			class="pb-1 transition-colors cursor-pointer {activeTab === 'utang-piutang'
				? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
				: 'text-[#6B7280] hover:text-[#111111]'}"
		>
			Utang/Piutang
		</button>
	</div>
</div>
