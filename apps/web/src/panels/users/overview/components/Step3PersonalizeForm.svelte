<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		type: 'store' | 'assistant';
		initialBotName?: string;
		initialSpeakingStyles?: string[];
		initialCustomRules?: string[];
		showSubmitButton?: boolean;
		onBack: () => void;
		onNext: () => void;
		onSubmitDraft: (data: {
			botName: string;
			speakingStyles: string[];
			customRules: string[];
		}) => void;
	}

	let {
		type,
		initialBotName = '',
		initialSpeakingStyles = ['Ramah', 'Informatif'],
		initialCustomRules = [],
		showSubmitButton = true,
		onBack,
		onNext,
		onSubmitDraft
	}: Props = $props();

	// State internal form
	let botName = $state('');
	let speakingStyles = $state<string[]>([]);
	let customRules = $state<string[]>([]);
	let isCustomRulesEnabled = $state(true);

	// Input penambah baru
	let newStyleInput = $state('');
	let newRuleInput = $state('');

	// Validasi: botName harus diisi dan minimal terdapat 1 speaking style
	let isValid = $derived(botName.trim().length > 0 && speakingStyles.length > 0);

	// Feedback submit
	let submitFeedback = $state(false);

	onMount(() => {
		botName = initialBotName;
		speakingStyles = initialSpeakingStyles.length > 0
			? [...initialSpeakingStyles]
			: ['Ramah', 'Informatif'];
		customRules = initialCustomRules.length > 0
			? [...initialCustomRules]
			: [];
	});

	$effect(() => {
		if (initialBotName && !botName) {
			botName = initialBotName;
		}
		if (initialSpeakingStyles && initialSpeakingStyles.length > 0 && speakingStyles.length === 0) {
			speakingStyles = [...initialSpeakingStyles];
		}
		if (initialCustomRules && initialCustomRules.length > 0 && customRules.length === 0) {
			customRules = [...initialCustomRules];
		}
	});

	// Tambah gaya bicara baru
	function addSpeakingStyle() {
		if (newStyleInput.trim()) {
			speakingStyles = [...speakingStyles, newStyleInput.trim()];
			newStyleInput = '';
			triggerDraftSave();
		}
	}

	// Hapus gaya bicara
	function removeSpeakingStyle(index: number) {
		speakingStyles = speakingStyles.filter((_, i) => i !== index);
		triggerDraftSave();
	}

	// Edit gaya bicara
	function editSpeakingStyle(index: number) {
		const current = speakingStyles[index];
		const updated = prompt('Edit style:', current);
		if (updated !== null && updated.trim()) {
			speakingStyles[index] = updated.trim();
			speakingStyles = [...speakingStyles];
			triggerDraftSave();
		}
	}

	// Tambah aturan kustom baru
	function addCustomRule() {
		if (newRuleInput.trim()) {
			customRules = [...customRules, newRuleInput.trim()];
			newRuleInput = '';
			triggerDraftSave();
		}
	}

	// Hapus aturan kustom
	function removeCustomRule(index: number) {
		customRules = customRules.filter((_, i) => i !== index);
		triggerDraftSave();
	}

	// Edit aturan kustom
	function editCustomRule(index: number) {
		const current = customRules[index];
		const updated = prompt('Edit custom rule:', current);
		if (updated !== null && updated.trim()) {
			customRules[index] = updated.trim();
			customRules = [...customRules];
			triggerDraftSave();
		}
	}

	function triggerDraftSave() {
		onSubmitDraft({
			botName: botName.trim(),
			speakingStyles,
			customRules: isCustomRulesEnabled ? customRules : []
		});
	}

	function handleSubmit() {
		if (!isValid) return;
		triggerDraftSave();
		submitFeedback = true;
		setTimeout(() => {
			submitFeedback = false;
		}, 2000);
	}

	function handleNext() {
		if (!isValid) return;
		triggerDraftSave();
		onNext();
	}
</script>

<div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-2 sm:py-6 select-none font-intel">
	<!-- Title (Matching Overview-3-store-personalize.png & Overview-3-assitant-personalize.png) -->
	<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-8 sm:mb-10 tracking-tight">
		{type === 'store' ? 'Personalize Your Store Assistant' : 'Personalize Your Assistant'}
	</h1>

	<!-- Top Input Pill: Bot Admin Name / Bot Name -->
	<div class="w-full max-w-lg sm:max-w-xl px-2 sm:px-0 mb-6 sm:mb-8">
		<div class="flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-6 py-4 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20">
			<input
				type="text"
				bind:value={botName}
				oninput={triggerDraftSave}
				placeholder={type === 'store' ? 'Bot Admin Name : ...' : 'Bot Name : ...'}
				class="w-full bg-transparent text-base sm:text-lg font-intel text-[#111111] placeholder:text-neutral-500 border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent"
			/>
		</div>
	</div>

	<!-- Card 1: Choose Speaking Style.. -->
	<div class="w-full max-w-lg sm:max-w-xl px-2 sm:px-0 mb-6 sm:mb-8">
		<div class="w-full rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xs">
			<h2 class="text-base sm:text-lg font-intel text-[#111111] mb-5 tracking-tight font-normal">
				Choose Speaking Style..
			</h2>

			<!-- Speaking Style Chips List -->
			<div class="flex flex-col gap-3.5 mb-5">
				{#each speakingStyles as style, index}
					<div class="flex items-center gap-2.5">
						<!-- Green Pill Chip -->
						<div class="px-5 py-2.5 rounded-2xl bg-[#5FD068] text-white text-sm sm:text-base font-intel shadow-xs inline-flex items-center">
							<span>{style}</span>
						</div>

						<!-- Action Icons: Edit (Black) & Trash (Red) -->
						<button
							type="button"
							onclick={() => editSpeakingStyle(index)}
							class="p-1 hover:opacity-75 transition-opacity cursor-pointer"
							title="Edit style"
						>
							<img src="/svg/overview/edit.svg" alt="Edit" class="w-4.5 h-4.5 object-contain" />
						</button>
						<button
							type="button"
							onclick={() => removeSpeakingStyle(index)}
							class="p-1 hover:opacity-75 transition-opacity cursor-pointer"
							title="Delete style"
						>
							<img src="/svg/overview/trash.svg" alt="Delete" class="w-4.5 h-4.5 object-contain" />
						</button>
					</div>
				{/each}
			</div>

			<!-- Add Style Pill Input -->
			<div class="relative flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-5 py-3 mt-4 transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20">
				<input
					type="text"
					bind:value={newStyleInput}
					placeholder="Type your Custom Rules bot..."
					onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpeakingStyle())}
					class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent pr-8"
				/>
				<button
					type="button"
					onclick={addSpeakingStyle}
					class="absolute right-5 text-xl font-intel text-neutral-500 hover:text-[#5FD068] transition-colors cursor-pointer"
					aria-label="Add style"
				>
					+
				</button>
			</div>
		</div>
	</div>

	<!-- Checkbox Toggle: Add Custom Rules ... -->
	<div class="w-full max-w-lg sm:max-w-xl px-2 sm:px-0 mb-6 flex items-center justify-start">
		<div
			class="flex items-center gap-2.5 cursor-pointer text-base sm:text-lg font-intel text-[#111111]"
			onclick={() => (isCustomRulesEnabled = !isCustomRulesEnabled)}
			onkeydown={(e) => e.key === ' ' && (isCustomRulesEnabled = !isCustomRulesEnabled)}
			tabindex="0"
			role="checkbox"
			aria-checked={isCustomRulesEnabled}
		>
			<span>Add Custom Rules ...</span>
			<span class="w-5 h-5 rounded-xs border border-neutral-400 flex items-center justify-center text-xs font-bold bg-white select-none">
				{isCustomRulesEnabled ? '✓' : ''}
			</span>
		</div>
	</div>

	<!-- Card 2: Custom Rules... (Visible when checked) -->
	{#if isCustomRulesEnabled}
		<div class="w-full max-w-lg sm:max-w-xl px-2 sm:px-0 mb-8 sm:mb-10 animate-in fade-in duration-150">
			<div class="w-full rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xs">
				<h2 class="text-base sm:text-lg font-intel text-[#111111] mb-5 tracking-tight font-normal">
					Custom Rules...
				</h2>

				<!-- Custom Rules Chips List -->
				<div class="flex flex-col gap-3.5 mb-5">
					{#each customRules as rule, index}
						<div class="flex items-center gap-2.5">
							<!-- Green Pill Chip -->
							<div class="px-5 py-2.5 rounded-2xl bg-[#5FD068] text-white text-sm sm:text-base font-intel shadow-xs inline-flex items-center">
								<span>{rule}</span>
							</div>

							<!-- Action Icons: Edit & Trash -->
							<button
								type="button"
								onclick={() => editCustomRule(index)}
								class="p-1 hover:opacity-75 transition-opacity cursor-pointer"
								title="Edit rule"
							>
								<img src="/svg/overview/edit.svg" alt="Edit" class="w-4.5 h-4.5 object-contain" />
							</button>
							<button
								type="button"
								onclick={() => removeCustomRule(index)}
								class="p-1 hover:opacity-75 transition-opacity cursor-pointer"
								title="Delete rule"
							>
								<img src="/svg/overview/trash.svg" alt="Delete" class="w-4.5 h-4.5 object-contain" />
							</button>
						</div>
					{/each}
				</div>

				<!-- Add Custom Rule Pill Input -->
				<div class="relative flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-5 py-3 mt-4 transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20">
					<input
						type="text"
						bind:value={newRuleInput}
						placeholder="Type your Custom Rules bot..."
						onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRule())}
						class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent pr-8"
					/>
					<button
						type="button"
						onclick={addCustomRule}
						class="absolute right-5 text-xl font-intel text-neutral-500 hover:text-[#5FD068] transition-colors cursor-pointer"
						aria-label="Add custom rule"
					>
						+
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Submit Button (Matching Overview-3-store-personalize.png) -->
	{#if showSubmitButton}
		<div class="flex flex-col items-center mb-6">
			<button
				type="button"
				onclick={handleSubmit}
				disabled={!isValid}
				class="px-12 py-3 rounded-full text-white text-base font-intel transition-all {isValid ? 'bg-[#5FD068] hover:bg-[#52c847] shadow-xs hover:shadow-md active:scale-95 cursor-pointer' : 'bg-neutral-300 cursor-not-allowed'}"
				title={isValid ? 'Save draft' : 'Please enter a bot name and at least 1 speaking style'}
			>
				Submit
			</button>
			{#if submitFeedback}
				<span class="text-xs text-[#1ED10E] mt-2 animate-in fade-in duration-150">
					Persona draft saved ✓
				</span>
			{/if}
		</div>
	{/if}

	<!-- Navigation Controls (Matching Overview-3*: "← Back   Next →") -->
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
			disabled={!isValid}
			class="transition-colors select-none {isValid ? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}"
			title={isValid ? 'Next' : 'Please enter a bot name and at least 1 speaking style'}
		>
			Next &rarr;
		</button>
	</div>

	{#if !isValid}
		<p class="text-xs text-neutral-400 mt-3 text-center select-none">
			{#if botName.trim().length === 0}
				* Please enter a bot name to continue
			{:else}
				* Add at least 1 speaking style to continue
			{/if}
		</p>
	{/if}
</div>

