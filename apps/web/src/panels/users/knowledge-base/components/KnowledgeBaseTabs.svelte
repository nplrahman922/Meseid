<script lang="ts">
	import type { KnowledgeBaseTab } from '../knowledge-base.types';

	interface Props {
		activeSubTab?: KnowledgeBaseTab;
		entriesCount?: number;
		unansweredCount?: number;
		onSelectTab?: (tab: KnowledgeBaseTab) => void;
	}

	let {
		activeSubTab = 'entries',
		entriesCount = 4,
		unansweredCount = 2,
		onSelectTab
	}: Props = $props();

	function handleTab(tab: KnowledgeBaseTab) {
		if (onSelectTab) {
			onSelectTab(tab);
		}
	}
</script>

<div class="flex items-center gap-6 border-b border-[#E5E7EB] text-xs sm:text-sm font-intel">
	<!-- Tab 1: Entri Usaha -->
	<button
		type="button"
		onclick={() => handleTab('entries')}
		class="pb-2.5 transition-colors cursor-pointer {activeSubTab === 'entries'
			? 'border-b-2 border-[#1ED10E] text-[#111111] font-semibold'
			: 'text-[#6B7280] hover:text-[#111111]'}"
	>
		Entri usaha ({entriesCount})
	</button>

	<!-- Tab 2: Pertanyaan Belum Terjawab -->
	<button
		type="button"
		onclick={() => handleTab('unanswered')}
		class="pb-2.5 transition-colors cursor-pointer text-left {activeSubTab === 'unanswered'
			? 'border-b-2 border-[#1ED10E] text-[#111111] font-semibold'
			: 'text-[#6B7280] hover:text-[#111111]'}"
	>
		Pertanyaan<br class="sm:hidden" /> belum terjawab ({unansweredCount})
	</button>
</div>
