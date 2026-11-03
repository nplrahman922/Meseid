<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	export interface KnowledgeBaseItem {
		title: string;
		category: string;
		description: string;
		onlyAssistant: boolean;
	}

	interface KnowledgeBaseCard {
		id: string;
		title: string;
		category: string;
		description: string;
		onlyAssistant: boolean;
	}

	interface Props {
		initialItems?: KnowledgeBaseItem[];
		onBack: () => void;
		onNext: () => void;
		onSubmitDraft: (items: KnowledgeBaseItem[]) => void;
	}

	let {
		initialItems = [],
		onBack,
		onNext,
		onSubmitDraft
	}: Props = $props();

	// Mode layar: 'intro' (Overview-4.png) atau 'form' (Overview-4-kb-forms.png)
	let viewMode = $state<'intro' | 'form'>('intro');
	let subDirection = $state<1 | -1>(1);

	// Daftar kotak form Knowledge Base (dapat bertambah / berkurang secara dinamis)
	let cards = $state<KnowledgeBaseCard[]>([]);
	let submitFeedback = $state(false);

	// Validasi: minimal ada 1 kartu yang memiliki judul dan deskripsi/kategori
	let isValid = $derived(
		cards.some(
			(c) =>
				c.title.trim().length > 0 &&
				(c.description.trim().length > 0 || c.category.trim().length > 0)
		)
	);

	onMount(() => {
		if (initialItems.length > 0) {
			cards = initialItems.map((item, idx) => ({
				id: `kb-card-${idx + 1}-${Date.now()}`,
				title: item.title || '',
				category: item.category || '',
				description: item.description || '',
				onlyAssistant: item.onlyAssistant ?? true
			}));
		} else {
			// Mulai dengan 1 kotak form awal jika belum ada data
			cards = [
				{
					id: `kb-card-1-${Date.now()}`,
					title: '',
					category: '',
					description: '',
					onlyAssistant: true
				}
			];
		}
	});

	// Tambah kotak form baru
	function handleAddCard() {
		const newCard: KnowledgeBaseCard = {
			id: `kb-card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
			title: '',
			category: '',
			description: '',
			onlyAssistant: true
		};
		cards = [...cards, newCard];
		triggerDraftSave();
	}

	// Hapus kotak form (hanya jika ada 2 kotak atau lebih)
	function handleRemoveCard(index: number) {
		if (cards.length >= 2) {
			cards = cards.filter((_, i) => i !== index);
			triggerDraftSave();
		}
	}

	function triggerDraftSave() {
		const validItems: KnowledgeBaseItem[] = cards.map((c) => ({
			title: c.title.trim(),
			category: c.category.trim(),
			description: c.description.trim(),
			onlyAssistant: c.onlyAssistant
		}));
		onSubmitDraft(validItems);
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

	function handleBack() {
		if (viewMode === 'form') {
			subDirection = -1;
			viewMode = 'intro';
		} else {
			onBack();
		}
	}
</script>

<div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-2 sm:py-6 select-none font-intel overflow-hidden">
	{#key viewMode}
		<div
			in:fly={{ x: subDirection * 40, duration: 280, easing: cubicOut }}
			class="flex flex-col items-center justify-center w-full"
		>
			{#if viewMode === 'intro'}
				<!-- Screen A: Intro Screen (Matching Overview-4.png) -->
				<div class="flex flex-col items-center justify-center w-full">
					<!-- Hero Illustration (Robot reading news with ?) -->
					<div class="flex items-center justify-center w-full mb-8 sm:mb-12">
						<img
							src="/svg/overview/overview-4-ai-reads.svg"
							alt="AI Reads KB"
							class="w-64 sm:w-80 md:w-[360px] h-auto object-contain pointer-events-none select-none"
						/>
					</div>

					<!-- Title (Verbatim: "Let AI Knows Your Bussiness..") -->
					<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-12 sm:mb-16 tracking-tight leading-relaxed">
						Let AI Knows Your<br />
						Bussiness..
					</h1>

					<!-- Navigation Controls (Matching Overview-4.png: "← Back   Next →") -->
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
							onclick={() => {
								subDirection = 1;
								viewMode = 'form';
							}}
							class="text-[#111111] hover:text-[#1ED10E] transition-colors cursor-pointer select-none"
						>
							Next &rarr;
						</button>
					</div>
				</div>
			{:else}
				<!-- Screen B: Knowledge Base Form (Matching Overview-4-kb-forms.png) -->
				<div class="flex flex-col items-center justify-center w-full">
			<!-- Title (Verbatim: "Knowledge Base AI") -->
			<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-6 sm:mb-8 tracking-tight">
				Knowledge Base AI
			</h1>

			<!-- Form Cards List (Bisa bertambah jika klik Add +) -->
			<div class="w-full max-w-lg sm:max-w-xl px-2 sm:px-0 mb-6 sm:mb-8 space-y-6">
				{#each cards as card, index (card.id)}
					<div
						class="relative w-full rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xs animate-in fade-in duration-200"
					>
						<!-- Trash Bin Icon (Hanya tampil jika ada 2 kotak atau lebih) -->
						{#if cards.length >= 2}
							<button
								type="button"
								onclick={() => handleRemoveCard(index)}
								class="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-lg text-neutral-400 hover:text-[#EF4444] hover:bg-red-50 transition-colors cursor-pointer select-none"
								title="Delete this topic card"
								aria-label="Delete this topic card"
							>
								<img src="/svg/overview/trash.svg" alt="Delete" class="w-5 h-5 object-contain" />
							</button>
						{/if}

						<!-- Field 1: Title/Topics... -->
						<div class="mb-5">
							<label
								for={`kb-title-${card.id}`}
								class="block text-sm sm:text-base font-intel text-[#111111] mb-2 font-normal"
							>
								Title/Topics...
							</label>
							<div
								class="flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-5 py-3.5 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20"
							>
								<input
									id={`kb-title-${card.id}`}
									type="text"
									bind:value={card.title}
									oninput={triggerDraftSave}
									placeholder="Type Title or Topics..."
									class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent"
								/>
							</div>
						</div>

						<!-- Field 2: Category... -->
						<div class="mb-5">
							<label
								for={`kb-category-${card.id}`}
								class="block text-sm sm:text-base font-intel text-[#111111] mb-2 font-normal"
							>
								Category...
							</label>
							<div
								class="flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-5 py-3.5 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20"
							>
								<input
									id={`kb-category-${card.id}`}
									type="text"
									bind:value={card.category}
									oninput={triggerDraftSave}
									placeholder="Type Your Category..."
									class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent"
								/>
							</div>
						</div>

						<!-- Field 3: Description -->
						<div class="mb-6">
							<label
								for={`kb-description-${card.id}`}
								class="block text-sm sm:text-base font-intel text-[#111111] mb-2 font-normal"
							>
								Description
							</label>
							<div
								class="w-full rounded-2xl border border-neutral-300 bg-white px-5 py-4 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20"
							>
								<textarea
									id={`kb-description-${card.id}`}
									bind:value={card.description}
									oninput={triggerDraftSave}
									placeholder="Type Your Description..."
									rows="4"
									class="w-full bg-transparent text-sm sm:text-base font-intel text-[#111111] placeholder:text-neutral-400 border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent resize-none"
								></textarea>
							</div>
						</div>

						<!-- Bottom Row Inside Card: Only Assitance Bot & Add + Button -->
						<div class="flex items-center justify-between pt-2">
							<!-- Verbatim typo: "Only Assitance Bot" -->
							<div
								class="flex items-center gap-2 cursor-pointer text-sm sm:text-base font-intel text-[#111111]"
								onclick={() => {
									card.onlyAssistant = !card.onlyAssistant;
									triggerDraftSave();
								}}
								onkeydown={(e) => {
									if (e.key === ' ') {
										card.onlyAssistant = !card.onlyAssistant;
										triggerDraftSave();
									}
								}}
								tabindex="0"
								role="checkbox"
								aria-checked={card.onlyAssistant}
							>
								<span>Only Assitance Bot</span>
								<span
									class="w-5 h-5 rounded-xs border border-neutral-400 flex items-center justify-center text-xs font-bold bg-white select-none"
								>
									{card.onlyAssistant ? '✓' : ''}
								</span>
							</div>

							<!-- Add + Button (Menambahkan kotak form baru) -->
							<button
								type="button"
								onclick={handleAddCard}
								class="px-6 py-2.5 rounded-full bg-[#5FD068] hover:bg-[#52c847] text-white text-sm sm:text-base font-intel shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
								title="Add a new topic card"
							>
								Add +
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Submit Button Below Card (Matching Overview-4-kb-forms.png) -->
			<div class="flex flex-col items-center mb-6">
				<button
					type="button"
					onclick={handleSubmit}
					disabled={!isValid}
					class="px-12 py-3 rounded-full text-white text-base font-intel transition-all {isValid ? 'bg-[#5FD068] hover:bg-[#52c847] shadow-xs hover:shadow-md active:scale-95 cursor-pointer' : 'bg-neutral-300 cursor-not-allowed'}"
					title={isValid ? 'Save draft' : 'Please enter at least 1 topic and description/category'}
				>
					Submit
				</button>
				{#if submitFeedback}
					<span class="text-xs text-[#1ED10E] mt-2 animate-in fade-in duration-150">
						Knowledge Base draft saved ({cards.length} cards) ✓
					</span>
				{/if}
			</div>

			<!-- Navigation Controls (Matching Overview-4-kb-forms.png: "← Back   Next →") -->
			<div class="flex items-center justify-center gap-10 text-sm sm:text-base font-intel">
				<button
					type="button"
					onclick={handleBack}
					class="text-[#111111] hover:text-[#1ED10E] transition-colors cursor-pointer select-none"
				>
					&larr; Back
				</button>
				<button
					type="button"
					onclick={handleNext}
					disabled={!isValid}
					class="transition-colors select-none {isValid ? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}"
					title={isValid ? 'Next' : 'Please enter at least 1 topic and description/category'}
				>
					Next &rarr;
				</button>
			</div>

			{#if !isValid}
				<p class="text-xs text-neutral-400 mt-3 text-center select-none">
					* Enter at least 1 knowledge topic (Title & Description/Category) to continue
				</p>
			{/if}
		</div>
	{/if}
	</div>
{/key}
</div>
