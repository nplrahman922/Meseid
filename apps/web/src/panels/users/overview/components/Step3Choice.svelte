<script lang="ts">
	interface Props {
		initialChoice?: 'setup' | 'default';
		onBack: () => void;
		onNext: (choice: 'setup' | 'default') => void;
	}

	let { initialChoice = 'setup', onBack, onNext }: Props = $props();

	let selectedChoice = $state<'setup' | 'default'>('setup');

	function handleNext() {
		onNext(selectedChoice);
	}
</script>

<div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-2 sm:py-6 select-none font-intel">
	<!-- Hero Illustration (Matching Overview-3.png) -->
	<div class="flex items-center justify-center w-full mb-10 sm:mb-14">
		<img
			src="/svg/overview/overview-3-integration-bots.svg"
			alt="Integration Bots"
			class="w-64 sm:w-80 md:w-[360px] h-auto object-contain pointer-events-none select-none"
		/>
	</div>

	<!-- Options List (Matching Overview-3.png) -->
	<div class="flex flex-col gap-5 sm:gap-6 w-full max-w-md sm:max-w-lg px-4 sm:px-0 mb-12">
		<!-- Option 1: Setting up your Bots ... -->
		<div
			class="flex items-center justify-between cursor-pointer py-1 text-base sm:text-lg font-intel text-[#111111]"
			onclick={() => (selectedChoice = 'setup')}
			onkeydown={(e) => e.key === ' ' && (selectedChoice = 'setup')}
			tabindex="0"
			role="radio"
			aria-checked={selectedChoice === 'setup'}
		>
			<span class="tracking-wide">Setting up your Bots ...</span>
			<span class="w-5 h-5 rounded-xs border border-neutral-400 flex items-center justify-center text-xs font-bold bg-white select-none">
				{selectedChoice === 'setup' ? '✓' : ''}
			</span>
		</div>

		<!-- Option 2: Use Default Settings ... -->
		<div
			class="flex items-center justify-between cursor-pointer py-1 text-base sm:text-lg font-intel text-[#111111]"
			onclick={() => (selectedChoice = 'default')}
			onkeydown={(e) => e.key === ' ' && (selectedChoice = 'default')}
			tabindex="0"
			role="radio"
			aria-checked={selectedChoice === 'default'}
		>
			<span class="tracking-wide">Use Default Settings ...</span>
			<span class="w-5 h-5 rounded-xs border border-neutral-400 flex items-center justify-center text-xs font-bold bg-white select-none">
				{selectedChoice === 'default' ? '✓' : ''}
			</span>
		</div>
	</div>

	<!-- Navigation Controls (Matching Overview-3.png: "← Back   Next →") -->
	<div class="flex items-center justify-center gap-10 text-sm sm:text-base font-intel">
		<button
			type="button"
			onclick={onBack}
			class="text-[#111111] hover:text-[#1ED10E] transition-colors cursor-pointer select-none"
		>
			&larr; Back
		</button>
		<button
			type="button"
			onclick={handleNext}
			class="text-[#111111] hover:text-[#1ED10E] transition-colors cursor-pointer select-none"
		>
			Next &rarr;
		</button>
	</div>
</div>

