<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		initialName?: string;
		onNext: (name: string) => void;
	}

	let { initialName = '', onNext }: Props = $props();

	let name = $state('');
	let inputElement: HTMLInputElement | undefined = $state();
	let isValid = $derived(name.trim().length > 0);
	let hasSynced = false;

	onMount(() => {
		if (initialName) {
			name = initialName;
			hasSynced = true;
		}
		inputElement?.focus();
	});

	$effect(() => {
		if (!hasSynced && initialName) {
			name = initialName;
			hasSynced = true;
		}
	});

	function handleSubmit(e?: Event) {
		if (e) e.preventDefault();
		if (!isValid) return;
		onNext(name.trim());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-2 sm:py-6">
	<!-- Hero Illustration (Matching overview1.png) -->
	<div class="flex items-center justify-center w-full mb-8 sm:mb-12">
		<img
			src="/svg/overview/hello-overview1.svg"
			alt="Hi Robot"
			class="w-64 sm:w-80 md:w-[380px] h-auto object-contain select-none pointer-events-none"
		/>
	</div>

	<!-- Title (Verbatim: "Let us Know Who You Are..") -->
	<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-8 sm:mb-12 tracking-normal select-none">
		Let us Know Who You Are..
	</h1>

	<!-- Input Pill (Disamarkan: soft neutral border + green focus) -->
	<form onsubmit={handleSubmit} class="w-full max-w-lg sm:max-w-xl px-2 sm:px-0 mb-8 sm:mb-12">
		<div
			class="relative flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-6 py-4.5 sm:py-5 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20"
		>
			<input
				type="text"
				bind:value={name}
				bind:this={inputElement}
				onkeydown={handleKeydown}
				placeholder="Enter Your Name..."
				class="w-full bg-transparent text-base sm:text-lg font-intel text-[#111111] placeholder:text-neutral-400 placeholder:font-intel border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent pr-8"
				aria-label="Enter Your Name"
				autocomplete="name"
			/>
			<button
				type="submit"
				disabled={!isValid}
				class="absolute right-6 transition-colors font-intel text-xl font-normal select-none {isValid ? 'text-neutral-500 hover:text-[#5FD068] cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}"
				aria-label="Next step"
				title={isValid ? 'Next' : 'Please enter your name first'}
			>
				&rarr;
			</button>
		</div>
	</form>

	<!-- Bottom Action Link (Verbatim: "→ Next ..") -->
	<div class="flex flex-col items-center justify-center w-full">
		<button
			type="button"
			onclick={handleSubmit}
			disabled={!isValid}
			class="text-sm sm:text-base font-intel transition-colors select-none inline-flex items-center gap-1.5 {isValid ? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}"
			title={isValid ? 'Next' : 'Please enter your name first'}
		>
			<span>&rarr; Next ..</span>
		</button>
		{#if !isValid}
			<span class="text-xs text-neutral-400 mt-2 text-center select-none">
				* Enter your name to continue
			</span>
		{/if}
	</div>
</div>
