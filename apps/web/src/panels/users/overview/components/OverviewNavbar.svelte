<script lang="ts">
	interface Props {
		currentStep?: number;
		onReset?: () => void;
	}

	let { currentStep = 1, onReset }: Props = $props();

	function handleResetClick() {
		if (onReset) {
			onReset();
		}
	}
</script>

<header class="w-full px-6 py-6 sm:px-10 sm:py-8 flex items-center justify-between select-none">
	<!-- Top Left Brand Logo (Matching overview1.png ... overview5.png) -->
	<div class="flex flex-col items-start gap-1">
		<img src="/svg/Logo.svg" alt="Meseid" class="h-6 w-auto" />
		<span class="text-[10px] sm:text-xs font-intel text-black tracking-tight">Meseid</span>
	</div>

	<!-- Top Right: Dev Reset Trigger (Hanya aktif di import.meta.env.DEV) -->
	{#if import.meta.env.DEV}
		<div class="flex items-center gap-2">
			<span class="text-xs font-intel text-[#6B7280] hidden sm:inline">
				Step {currentStep}/5
			</span>
			<button
				type="button"
				onclick={handleResetClick}
				class="px-3 py-1.5 rounded-full text-xs font-intel bg-neutral-100 hover:bg-neutral-200 text-[#111111] border border-neutral-300 transition-colors cursor-pointer"
				title="Reset onboarding status and draft data for testing"
			>
				Reset Onboarding (Dev)
			</button>
		</div>
	{/if}
</header>

