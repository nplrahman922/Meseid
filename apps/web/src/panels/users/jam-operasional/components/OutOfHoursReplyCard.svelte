<script lang="ts">
	import type { OutOfHoursConfig } from '../jam-operasional.types';

	interface Props {
		config?: OutOfHoursConfig;
		botName?: string;
		onSave?: () => void;
	}

	let {
		config = $bindable({
			isEnabled: true,
			message:
				'Terima kasih sudah menghubungi Warung Bu Rina. Warung buka Senin–Sabtu, 08.00–20.00 WIB. Bu Rina akan membalas saat jam buka berikutnya. Rini tetap bisa bantu info menu dan harga.'
		}),
		botName = 'Rini',
		onSave
	}: Props = $props();

	let isSaved = $state(false);

	function toggleEnabled() {
		config.isEnabled = !config.isEnabled;
	}

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
		Balasan di luar jam buka
	</h2>

	<!-- Toggle Switch Box -->
	<div class="p-3.5 rounded-xl border border-[#E5E7EB] flex items-center gap-3 bg-white">
		<button
			type="button"
			aria-label="Toggle Balasan Luar Jam"
			onclick={toggleEnabled}
			class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {config.isEnabled ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
		>
			<span
				class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {config.isEnabled ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
			></span>
		</button>
		<div>
			<div class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Balasan luar jam · {config.isEnabled ? 'Aktif' : 'Nonaktif'}
			</div>
			<div class="text-[11px] font-intel {config.isEnabled ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
				{config.isEnabled ? 'Aktif' : 'Nonaktif'}
			</div>
		</div>
	</div>

	<!-- Automatic Message Textarea -->
	<div class="space-y-1.5">
		<label for="out-of-hours-textarea" class="block text-xs font-intel font-medium text-[#111111]">
			Pesan otomatis
		</label>
		<textarea
			id="out-of-hours-textarea"
			rows="4"
			bind:value={config.message}
			placeholder="Tulis pesan otomatis di luar jam operasional..."
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
		></textarea>
	</div>

	<!-- Submit Button & Feedback -->
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={handleSave}
			class="px-5 py-2.5 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] transition-colors rounded-xl cursor-pointer shadow-xs"
		>
			Simpan balasan
		</button>
		{#if isSaved}
			<span class="text-xs font-intel text-[#0E6B2B] animate-pulse">
				✓ Pesan balasan tersimpan
			</span>
		{/if}
	</div>

	<!-- Live Preview Section -->
	<div class="space-y-2 pt-2 border-t border-[#F3F4F6]">
		<div class="text-xs font-intel font-medium text-[#111111]">
			Pratinjau · Minggu, 18 Okt 2026
		</div>
		<div class="bg-[#E8F9E6] border border-[#C6F0C2] rounded-2xl p-4 space-y-1 shadow-xs">
			<div class="text-[11px] font-intel font-semibold text-[#0E6B2B]">
				{botName} · Asisten
			</div>
			<p class="text-xs font-inter text-[#111111] leading-relaxed whitespace-pre-wrap">
				{config.message}
			</p>
		</div>
	</div>
</div>
