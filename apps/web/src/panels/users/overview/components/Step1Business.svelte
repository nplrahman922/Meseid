<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	export type BusinessType = 'kuliner' | 'toko' | 'jasa' | 'lainnya';

	interface Props {
		initialBusinessName?: string;
		initialBusinessType?: BusinessType;
		initialCustomCategory?: string;
		initialBusinessDescription?: string;
		onBack: () => void;
		onNext: (data: {
			businessName: string;
			businessType: BusinessType;
			customCategory?: string;
			businessDescription?: string;
		}) => void;
	}

	let {
		initialBusinessName = '',
		initialBusinessType = 'kuliner',
		initialCustomCategory = '',
		initialBusinessDescription = '',
		onBack,
		onNext
	}: Props = $props();

	let businessName = $state('');
	let businessType = $state<BusinessType>('kuliner');
	let customCategory = $state('');
	let businessDescription = $state('');
	let businessInputElement: HTMLInputElement | undefined = $state();

	const BUSINESS_CATEGORIES: Array<{
		id: BusinessType;
		title: string;
		subtitle: string;
	}> = [
		{
			id: 'kuliner',
			title: 'Culinary & F&B',
			subtitle: 'Cafes, Restaurants, Bakeries, Food stalls'
		},
		{
			id: 'toko',
			title: 'Retail & Store',
			subtitle: 'Grocery, Fashion, Electronics, Minimarkets'
		},
		{
			id: 'jasa',
			title: 'Services',
			subtitle: 'Laundry, Salons, Workshops, Agencies'
		},
		{
			id: 'lainnya',
			title: 'Other',
			subtitle: 'General trade and specialized services'
		}
	];

	// Validation: businessName must be filled, and if 'Other' is selected, customCategory must also be filled
	let isNameValid = $derived(businessName.trim().length > 0);
	let isOtherValid = $derived(businessType !== 'lainnya' || customCategory.trim().length > 0);
	let isValid = $derived(isNameValid && isOtherValid);

	let hasSynced = false;

	onMount(() => {
		if (initialBusinessName) {
			businessName = initialBusinessName;
			businessType = initialBusinessType || 'kuliner';
			customCategory = initialCustomCategory || '';
			businessDescription = initialBusinessDescription || '';
			hasSynced = true;
		} else {
			businessType = initialBusinessType || 'kuliner';
			customCategory = initialCustomCategory || '';
			businessDescription = initialBusinessDescription || '';
		}
		businessInputElement?.focus();
	});

	$effect(() => {
		if (!hasSynced && initialBusinessName) {
			businessName = initialBusinessName;
			businessType = initialBusinessType || 'kuliner';
			customCategory = initialCustomCategory || '';
			businessDescription = initialBusinessDescription || '';
			hasSynced = true;
		}
	});

	function handleSubmit(e?: Event) {
		if (e) e.preventDefault();
		if (!isValid) return;
		onNext({
			businessName: businessName.trim(),
			businessType,
			customCategory: businessType === 'lainnya' ? customCategory.trim() : undefined,
			businessDescription: businessType === 'lainnya' ? businessDescription.trim() : undefined
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && isValid) {
			handleSubmit();
		}
	}
</script>

<div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-2 sm:py-6 select-none font-intel">
	<!-- Hero Illustration (Matching hello-overview1.svg) -->
	<div class="flex items-center justify-center w-full mb-6 sm:mb-8">
		<img
			src="/svg/overview/hello-overview1.svg"
			alt="Hi Robot"
			class="w-56 sm:w-72 md:w-[320px] h-auto object-contain select-none pointer-events-none"
		/>
	</div>

	<!-- Title & Subtitle in English (No Emojis) -->
	<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-2.5 tracking-normal">
		Tell Us About Your Business..
	</h1>
	<p class="text-xs sm:text-sm text-neutral-500 text-center max-w-md px-4 mb-8 leading-relaxed">
		Enter your store name and select your industry to configure your AI assistant.
	</p>

	<!-- Main Form -->
	<form onsubmit={handleSubmit} class="w-full max-w-lg sm:max-w-xl px-4 sm:px-0 flex flex-col gap-6 mb-8">
		<!-- 1. Business / Store Name Input (No Emojis) -->
		<div class="flex flex-col gap-1.5 w-full">
			<label for="business-name-input" class="text-xs sm:text-sm font-medium text-neutral-700 flex items-center justify-between">
				<span>Business Name</span>
				<span class="text-[11px] text-neutral-400 font-normal">Shown to customers &amp; reports</span>
			</label>
			<div
				class="relative flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-5 py-4 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20"
			>
				<input
					id="business-name-input"
					type="text"
					bind:value={businessName}
					bind:this={businessInputElement}
					onkeydown={handleKeydown}
					placeholder="Enter your business or store name..."
					class="w-full bg-transparent text-base sm:text-lg font-intel text-[#111111] placeholder:text-neutral-400 border-0 outline-none focus:outline-none focus:ring-0"
					autocomplete="organization"
				/>
			</div>
		</div>

		<!-- 2. Business Category Selection (No Emojis - Clean Typography) -->
		<div class="flex flex-col gap-2 w-full pt-1">
			<div class="flex items-center justify-between">
				<span class="text-xs sm:text-sm font-medium text-neutral-700">Industry / Category</span>
				<span class="text-[11px] text-neutral-400 font-normal">Helps AI tailor its vocabulary</span>
			</div>

			<!-- 2x2 Clean Cards Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full" role="radiogroup" aria-label="Business Category">
				{#each BUSINESS_CATEGORIES as category}
					<button
						type="button"
						onclick={() => (businessType = category.id)}
						class="flex flex-col justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer select-none {
							businessType === category.id
								? 'border-[#5FD068] bg-[#5FD068]/10 ring-2 ring-[#5FD068]/20 shadow-xs'
								: 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/70'
						}"
						role="radio"
						aria-checked={businessType === category.id}
					>
						<div class="flex items-center justify-between w-full mb-1">
							<span class="text-sm font-semibold text-[#111111] tracking-tight">
								{category.title}
							</span>
							{#if businessType === category.id}
								<span class="w-4 h-4 rounded-full bg-[#5FD068] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
									✓
								</span>
							{/if}
						</div>
						<p class="text-xs text-neutral-500 leading-snug">
							{category.subtitle}
						</p>
					</button>
				{/each}
			</div>

			<!-- 3. Expandable Custom Details for 'Other' (No Emojis) -->
			{#if businessType === 'lainnya'}
				<div
					transition:slide={{ duration: 220 }}
					class="flex flex-col gap-4 p-4.5 sm:p-5 rounded-2xl border border-[#5FD068]/40 bg-[#5FD068]/5 mt-2 animate-in fade-in duration-200"
				>
					<!-- Specific Category Name -->
					<div class="flex flex-col gap-1.5 w-full">
						<label for="custom-category-input" class="text-xs sm:text-sm font-medium text-neutral-800 flex items-center justify-between">
							<span>Specific Category</span>
							<span class="text-[11px] text-neutral-400 font-normal">e.g. Pet Care, Agriculture, Education</span>
						</label>
						<div class="relative flex items-center w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 shadow-2xs focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20 transition-all">
							<input
								id="custom-category-input"
								type="text"
								bind:value={customCategory}
								onkeydown={handleKeydown}
								placeholder="Enter specific category name..."
								class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 outline-none focus:outline-none focus:ring-0"
							/>
						</div>
					</div>

					<!-- Business Description -->
					<div class="flex flex-col gap-1.5 w-full">
						<label for="business-desc-input" class="text-xs sm:text-sm font-medium text-neutral-800 flex items-center justify-between">
							<span>Business Description</span>
							<span class="text-[11px] text-neutral-400 font-normal">Brief summary of what you sell or offer</span>
						</label>
						<div class="relative flex items-center w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 shadow-2xs focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20 transition-all">
							<input
								id="business-desc-input"
								type="text"
								bind:value={businessDescription}
								onkeydown={handleKeydown}
								placeholder="e.g. Pet grooming, supplies, and veterinary consultations..."
								class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 outline-none focus:outline-none focus:ring-0"
							/>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</form>

	<!-- Navigation Controls (← Back   Next →) -->
	<div class="flex items-center justify-center gap-10 text-sm sm:text-base font-intel pt-2">
		<button
			type="button"
			onclick={onBack}
			class="text-[#111111] hover:text-[#1ED10E] transition-colors cursor-pointer select-none"
		>
			&larr; Back
		</button>

		<button
			type="button"
			onclick={handleSubmit}
			disabled={!isValid}
			class={`transition-colors select-none ${
				isValid
					? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer'
					: 'text-neutral-300 cursor-not-allowed pointer-events-none'
			}`}
			title={!isNameValid ? 'Please enter your business name' : !isOtherValid ? 'Please enter your specific category' : 'Next'}
		>
			Next &rarr;
		</button>
	</div>

	{#if !isNameValid}
		<p class="text-xs text-neutral-400 mt-3 text-center select-none">
			* Enter your business name to continue
		</p>
	{:else if !isOtherValid}
		<p class="text-xs text-neutral-400 mt-3 text-center select-none">
			* Enter your specific category to continue
		</p>
	{/if}
</div>
