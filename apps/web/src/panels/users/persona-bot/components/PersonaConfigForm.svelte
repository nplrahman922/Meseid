<script lang="ts">
	interface Props {
		role: 'assistant' | 'admin';
		botName: string;
		language: string;
		speakingStyles: string[];
		customRules: string[];
		isCustomRulesEnabled?: boolean;
		isSaving?: boolean;
		onSave?: () => void;
	}

	let {
		role,
		botName = $bindable(''),
		language = $bindable(''),
		speakingStyles = $bindable([]),
		customRules = $bindable([]),
		isCustomRulesEnabled = $bindable(true),
		isSaving = false,
		onSave
	}: Props = $props();

	let newStyleInput = $state('');
	let newRuleInput = $state('');
	let isSavedSuccess = $state(false);

	function addSpeakingStyle() {
		if (newStyleInput.trim()) {
			speakingStyles = [...speakingStyles, newStyleInput.trim()];
			newStyleInput = '';
		}
	}

	function removeSpeakingStyle(index: number) {
		speakingStyles = speakingStyles.filter((_, i) => i !== index);
	}

	function editSpeakingStyle(index: number) {
		const current = speakingStyles[index];
		const updated = prompt('Edit gaya bicara:', current);
		if (updated !== null && updated.trim()) {
			speakingStyles[index] = updated.trim();
			speakingStyles = [...speakingStyles];
		}
	}

	function addCustomRule() {
		if (newRuleInput.trim()) {
			customRules = [...customRules, newRuleInput.trim()];
			newRuleInput = '';
		}
	}

	function removeCustomRule(index: number) {
		customRules = customRules.filter((_, i) => i !== index);
	}

	function editCustomRule(index: number) {
		const current = customRules[index];
		const updated = prompt('Edit aturan khusus:', current);
		if (updated !== null && updated.trim()) {
			customRules[index] = updated.trim();
			customRules = [...customRules];
		}
	}

	function handleSaveClick() {
		if (onSave) onSave();
		isSavedSuccess = true;
		setTimeout(() => {
			isSavedSuccess = false;
		}, 3000);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs">
	<!-- Card Title & Role Badge -->
	<div class="flex items-center justify-between pb-2 border-b border-[#F3F4F6]">
		<div class="flex items-center gap-2">
			{#if role === 'assistant'}
				<svg class="w-5 h-5 text-[#0E6B2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
					Personalisasi Asisten Pemilik
				</h2>
			{:else}
				<svg class="w-5 h-5 text-[#0E6B2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
					Personalisasi Admin Toko
				</h2>
			{/if}
		</div>
		<span class="text-[11px] font-intel px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
			{role === 'assistant' ? 'Internal Pemilik' : 'Publik Pelanggan'}
		</span>
	</div>

	<!-- Field 1: Nama Bot -->
	<div class="space-y-1.5">
		<label for={`bot-name-input-${role}`} class="block text-xs font-intel font-medium text-[#111111]">
			{role === 'assistant' ? 'Nama Bot Asisten' : 'Nama Bot Admin Toko'}
		</label>
		<input
			id={`bot-name-input-${role}`}
			type="text"
			bind:value={botName}
			placeholder={role === 'assistant' ? 'Contoh: Asisten EnBee / Jarvis' : 'Contoh: Admin Toko EnBee'}
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		/>
		<p class="text-[11px] font-inter text-[#6B7280]">
			{role === 'assistant'
				? 'Nama asisten yang menemani Anda mencatat operasional bisnis.'
				: 'Nama yang muncul saat pelanggan chat ke akun toko Anda.'}
		</p>
	</div>

	<!-- Field 2: Bahasa Balasan Bot -->
	<div class="space-y-1.5">
		<label for={`bot-language-input-${role}`} class="block text-xs font-intel font-medium text-[#111111]">
			Bahasa Balasan Bot
		</label>
		<input
			id={`bot-language-input-${role}`}
			type="text"
			bind:value={language}
			placeholder="Biarkan kosong untuk otomatis ikuti bahasa penanya"
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		/>
		<p class="text-[11px] font-inter text-[#6B7280]">
			Bebas diisi bahasa apa pun (misal: "Bahasa Indonesia santai", "Bahasa Jawa", "English") atau kosongkan untuk otomatis.
		</p>
	</div>

	<!-- Field 3: Gaya Bicara (Speaking Styles Chips) -->
	<div class="space-y-2.5">
		<span class="block text-xs font-intel font-medium text-[#111111]">
			Gaya Bicara Bot
		</span>

		<!-- Chips List -->
		<div class="flex flex-wrap gap-2">
			{#each speakingStyles as style, index}
				<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5FD068] text-white text-xs font-intel shadow-2xs">
					<span>{style}</span>
					<button
						type="button"
						onclick={() => editSpeakingStyle(index)}
						class="hover:opacity-75 p-0.5 cursor-pointer"
						title="Edit gaya bicara"
					>
						<svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
					</button>
					<button
						type="button"
						onclick={() => removeSpeakingStyle(index)}
						class="hover:opacity-75 p-0.5 cursor-pointer"
						title="Hapus gaya bicara"
					>
						<svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			{/each}
		</div>

		<!-- Add Input -->
		<div class="flex items-center gap-2 pt-1">
			<input
				type="text"
				bind:value={newStyleInput}
				placeholder="Tambah gaya bicara (misal: Solutif, Santai)..."
				onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpeakingStyle(); } }}
				class="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
			/>
			<button
				type="button"
				onclick={addSpeakingStyle}
				class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-intel font-medium transition-colors cursor-pointer"
			>
				Tambah
			</button>
		</div>
	</div>

	<!-- Field 4: Aturan Khusus (Custom Rules Chips) -->
	<div class="space-y-2.5">
		<div class="flex items-center justify-between">
			<span class="block text-xs font-intel font-medium text-[#111111]">
				Aturan Khusus
			</span>
			<label class="flex items-center gap-2 cursor-pointer text-[11px] text-[#6B7280]">
				<input
					type="checkbox"
					bind:checked={isCustomRulesEnabled}
					class="rounded border-gray-300 text-[#0E6B2B] focus:ring-[#0E6B2B]"
				/>
				<span>Aktifkan aturan</span>
			</label>
		</div>

		{#if isCustomRulesEnabled}
			<!-- Chips List -->
			<div class="flex flex-col gap-2">
				{#each customRules as rule, index}
					<div class="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-intel text-gray-900">
						<span class="flex-1 leading-relaxed">{rule}</span>
						<div class="flex items-center gap-1 shrink-0">
							<button
								type="button"
								onclick={() => editCustomRule(index)}
								class="p-1 hover:text-gray-900 text-gray-500 cursor-pointer"
								title="Edit aturan"
							>
								<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
							<button
								type="button"
								onclick={() => removeCustomRule(index)}
								class="p-1 hover:text-red-700 text-red-500 cursor-pointer"
								title="Hapus aturan"
							>
								<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Add Rule Input -->
			<div class="flex items-center gap-2 pt-1">
				<input
					type="text"
					bind:value={newRuleInput}
					placeholder={role === 'assistant' ? 'Contoh: Panggil Bos dengan Raja Sang Maharaja...' : 'Contoh: Jangan beri diskon tanpa konfirmasi...'}
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRule(); } }}
					class="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
				/>
				<button
					type="button"
					onclick={addCustomRule}
					class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-intel font-medium transition-colors cursor-pointer"
				>
					Tambah
				</button>
			</div>
		{/if}
	</div>

	<!-- Submit Button & Live Feedback -->
	<div class="flex items-center gap-3 pt-2 border-t border-[#F3F4F6]">
		<button
			type="button"
			disabled={isSaving}
			onclick={handleSaveClick}
			class="px-5 py-2.5 text-xs sm:text-sm font-intel font-medium text-white bg-[#0E6B2B] hover:bg-[#0c5924] transition-colors rounded-xl cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
		>
			{#if isSaving}
				<svg class="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
				<span>Menyimpan &amp; Menyimulasikan...</span>
			{:else}
				<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
				<span>Simpan Persona</span>
			{/if}
		</button>
		{#if isSavedSuccess}
			<span class="text-xs font-intel text-[#0E6B2B] inline-flex items-center gap-1.5 animate-pulse">
				<svg class="w-3.5 h-3.5 text-[#0E6B2B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
				<span>Persona berhasil disimpan &amp; pratinjau diperbarui!</span>
			</span>
		{/if}
	</div>
</div>
