<script lang="ts">
	import type { BotPersonaConfig, BotTone } from '../persona-bot.types';

	interface Props {
		personaConfig?: BotPersonaConfig;
		onSave?: () => void;
	}

	let {
		personaConfig = $bindable({
			botName: 'Rini',
			tone: 'ramah',
			greetingMessage:
				'Halo! Saya Rini, asisten Warung Bu Rina. Mau tanya menu, harga, atau jam buka?',
			additionalDirectives:
				'Gunakan bahasa Indonesia sehari-hari. Jangan menebak stok atau ongkir; arahkan ke Bu Rina jika informasinya belum ada.'
		}),
		onSave
	}: Props = $props();

	let isSaved = $state(false);

	const toneDescriptions: Record<BotTone, string> = {
		ramah: 'Pilihan: Ramah & praktis. Jawaban singkat, sopan, dan menyebut detail penting.',
		formal: 'Pilihan: Formal. Bahasa baku, profesional, dan struktur rapi.',
		santai: 'Pilihan: Santai. Nada akrab, santai, dan ramah seperti teman.'
	};

	function handleSave() {
		isSaved = true;
		if (onSave) onSave();
		setTimeout(() => {
			isSaved = false;
		}, 2500);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Cara bot menyapa
	</h2>

	<!-- Field 1: Nama bot -->
	<div class="space-y-1.5">
		<label for="bot-name-input" class="block text-xs font-intel font-medium text-[#111111]">
			Nama bot
		</label>
		<input
			id="bot-name-input"
			type="text"
			bind:value={personaConfig.botName}
			placeholder="Contoh: Rini"
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		/>
		<p class="text-[11px] font-inter text-[#6B7280]">
			Nama yang muncul di percakapan pelanggan.
		</p>
	</div>

	<!-- Field 2: Nada bicara -->
	<div class="space-y-2">
		<span class="block text-xs font-intel font-medium text-[#111111]">
			Nada bicara
		</span>
		<div class="flex items-center gap-6 border-b border-[#E5E7EB] text-xs font-intel">
			<button
				type="button"
				onclick={() => (personaConfig.tone = 'ramah')}
				class="pb-2 transition-colors cursor-pointer {personaConfig.tone === 'ramah'
					? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
					: 'text-[#6B7280] hover:text-[#111111]'}"
			>
				Ramah &amp; praktis
			</button>
			<button
				type="button"
				onclick={() => (personaConfig.tone = 'formal')}
				class="pb-2 transition-colors cursor-pointer {personaConfig.tone === 'formal'
					? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
					: 'text-[#6B7280] hover:text-[#111111]'}"
			>
				Formal
			</button>
			<button
				type="button"
				onclick={() => (personaConfig.tone = 'santai')}
				class="pb-2 transition-colors cursor-pointer {personaConfig.tone === 'santai'
					? 'border-b-2 border-[#1ED10E] text-[#0E6B2B] font-semibold'
					: 'text-[#6B7280] hover:text-[#111111]'}"
			>
				Santai
			</button>
		</div>
		<p class="text-[11px] font-inter text-[#6B7280]">
			{toneDescriptions[personaConfig.tone]}
		</p>
	</div>

	<!-- Field 3: Pesan sapaan -->
	<div class="space-y-1.5">
		<label for="bot-greeting-input" class="block text-xs font-intel font-medium text-[#111111]">
			Pesan sapaan
		</label>
		<textarea
			id="bot-greeting-input"
			rows="3"
			bind:value={personaConfig.greetingMessage}
			placeholder="Tulis pesan sapaan awal bot..."
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		></textarea>
		<p class="text-[11px] font-inter text-[#6B7280]">
			Dipakai ketika pelanggan memulai percakapan baru.
		</p>
	</div>

	<!-- Field 4: Arahan tambahan -->
	<div class="space-y-1.5">
		<label for="bot-directives-input" class="block text-xs font-intel font-medium text-[#111111]">
			Arahan tambahan
		</label>
		<textarea
			id="bot-directives-input"
			rows="3"
			bind:value={personaConfig.additionalDirectives}
			placeholder="Petunjuk khusus kepribadian atau batasan bot..."
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		></textarea>
	</div>

	<!-- Submit Button & Feedback -->
	<div class="flex items-center gap-3 pt-1">
		<button
			type="button"
			onclick={handleSave}
			class="px-5 py-2.5 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] transition-colors rounded-xl cursor-pointer shadow-xs"
		>
			Simpan persona
		</button>
		{#if isSaved}
			<span class="text-xs font-intel text-[#0E6B2B] animate-pulse">
				✓ Persona berhasil disimpan
			</span>
		{/if}
	</div>
</div>
