<script lang="ts">
	interface Props {
		currentStep?: number;
		onReset?: () => void;
		onSkip?: () => void;
	}

	let { currentStep = 1, onReset, onSkip }: Props = $props();

	function handleResetClick() {
		if (onReset) {
			onReset();
		}
	}

	function handleSkipClick() {
		if (onSkip) {
			onSkip();
		}
	}
</script>

<header class="w-full px-6 py-6 sm:px-10 sm:py-8 flex items-center justify-between select-none">
	<!-- Top Left Brand Logo (Matching overview1.png ... overview5.png) -->
	<div class="flex flex-col items-start gap-1">
		<img src="/svg/Logo.svg" alt="Meseid" class="h-6 w-auto" />
		<span class="text-[10px] sm:text-xs font-intel text-black tracking-tight">Meseid</span>
	</div>

	<!-- Top Right: Dev Reset Trigger & Skip to Dashboard -->
	<div class="flex items-center gap-2 sm:gap-3">
		{#if import.meta.env.DEV}
			<span class="text-xs font-intel text-[#6B7280] hidden sm:inline">
				Step {currentStep}/5
			</span>
			<button
				type="button"
				onclick={handleResetClick}
				class="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-intel bg-neutral-100 hover:bg-neutral-200 text-[#111111] border border-neutral-300 transition-colors cursor-pointer"
				title="Reset onboarding status and draft data for testing"
			>
				Reset (Dev)
			</button>
		{/if}

		<button
			type="button"
			onclick={handleSkipClick}
			class="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-intel font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
			title="Lewati penyiapan dan masuk langsung ke Dashboard"
		>
			<span>Lewati ke Dashboard</span>
			<span class="text-[11px] font-bold">&rarr;</span>
		</button>
	</div>
</header>

