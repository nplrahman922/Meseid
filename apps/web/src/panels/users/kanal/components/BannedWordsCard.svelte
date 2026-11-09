<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchModerationSettings, updateModerationSettings } from '../moderation.service';

	let bannedWords = $state<string[]>([]);
	let groupModerationEnabled = $state(true);
	let newWordInput = $state('');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let statusMessage = $state<string | null>(null);
	let isError = $state(false);

	onMount(async () => {
		isLoading = true;
		const res = await fetchModerationSettings();
		if (res.success) {
			bannedWords = res.bannedWords || [];
			groupModerationEnabled = res.groupModerationEnabled !== false;
		} else {
			statusMessage = res.error || 'Gagal memuat pengaturan kata terlarang.';
			isError = true;
		}
		isLoading = false;
	});

	function addWord() {
		const trimmed = newWordInput.trim().toLowerCase();
		if (!trimmed) return;

		if (!bannedWords.includes(trimmed)) {
			bannedWords = [...bannedWords, trimmed];
		}
		newWordInput = '';
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addWord();
		}
	}

	function removeWord(wordToRemove: string) {
		bannedWords = bannedWords.filter((w) => w !== wordToRemove);
	}

	async function handleSave() {
		isSaving = true;
		statusMessage = null;
		isError = false;

		const res = await updateModerationSettings(bannedWords, groupModerationEnabled);
		if (res.success) {
			statusMessage = 'Pengaturan kata terlarang berhasil disimpan.';
			isError = false;
			setTimeout(() => {
				if (statusMessage === 'Pengaturan kata terlarang berhasil disimpan.') {
					statusMessage = null;
				}
			}, 3500);
		} else {
			statusMessage = res.error || 'Gagal menyimpan pengaturan.';
			isError = true;
		}
		isSaving = false;
	}
</script>

<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
	<!-- Header Section -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-lg">
				🛡️
			</div>
			<div>
				<h3 class="text-base font-bold text-gray-900 flex items-center gap-2">
					Moderasi & Sensor Kata Terlarang (Group Guard)
					<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
						Aktif (&lt; 1 ms)
					</span>
				</h3>
				<p class="text-xs text-gray-500 mt-0.5">
					Saring pesan SARA, kata kasar, promosi judi/spam, dan kata-kata terlarang pilihan Anda di grup dan saluran komunikasi.
				</p>
			</div>
		</div>

		<!-- Toggle Moderasi Grup -->
		<label class="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-700 self-start sm:self-auto">
			<span>Moderasi Otomatis Grup</span>
			<input
				type="checkbox"
				class="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
				bind:checked={groupModerationEnabled}
			/>
		</label>
	</div>

	<!-- Kategori Terproteksi Bawaan Sistem -->
	<div class="bg-gray-50/70 rounded-lg p-3.5 border border-gray-100 text-xs text-gray-600 space-y-2">
		<span class="font-semibold text-gray-700 block">Kategori Terproteksi Otomatis:</span>
		<div class="flex flex-wrap gap-2">
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 font-medium shadow-2xs">
				<span class="text-rose-500">●</span> SARA & Ujaran Kebencian
			</span>
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 font-medium shadow-2xs">
				<span class="text-amber-500">●</span> Perkataan Kasar / Vulgar
			</span>
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 font-medium shadow-2xs">
				<span class="text-purple-500">●</span> Spam Judi Online & Pinjol
			</span>
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 font-medium shadow-2xs">
				<span class="text-sky-500">●</span> Normalisasi Anti-Leetspeak (@, 3, 1, 0, spasi)
			</span>
		</div>
	</div>

	<!-- Input Tambah Kata Terlarang Kustom -->
	<div class="space-y-3">
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
			<label for="banned-word-input" class="text-xs font-bold text-gray-800">
				Daftar Kata Terlarang Pilihan Owner ({bannedWords.length})
			</label>
			<span class="text-[11px] text-gray-400">
				Ketik kata lalu tekan Enter atau klik Tambah
			</span>
		</div>

		<div class="flex gap-2">
			<input
				id="banned-word-input"
				type="text"
				placeholder="Contoh: tokosebelah, warungtetangga, kata_rahasia..."
				class="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
				bind:value={newWordInput}
				onkeydown={handleKeyDown}
				disabled={isLoading || isSaving}
			/>
			<button
				type="button"
				class="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
				onclick={addWord}
				disabled={!newWordInput.trim() || isLoading || isSaving}
			>
				+ Tambah
			</button>
		</div>

		<!-- Tag Chips Display -->
		<div class="min-h-[50px] p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 flex flex-wrap gap-2 items-center">
			{#if isLoading}
				<span class="text-xs text-gray-400 italic">Memuat konfigurasi kata terlarang...</span>
			{:else if bannedWords.length === 0}
				<span class="text-xs text-gray-400 italic">
					Belum ada kata terlarang kustom. Ketik kata di atas untuk menambahkan.
				</span>
			{:else}
				{#each bannedWords as word}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs group hover:bg-rose-100 transition-colors">
						<span>{word}</span>
						<button
							type="button"
							class="w-4 h-4 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-800 hover:bg-rose-200/80 transition-colors text-xs font-bold cursor-pointer"
							onclick={() => removeWord(word)}
							title="Hapus kata ini"
						>
							×
						</button>
					</span>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Action Footer -->
	<div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
		<div>
			{#if statusMessage}
				<p class="text-xs font-medium {isError ? 'text-rose-600' : 'text-emerald-600'}">
					{isError ? '❌ ' : '✅ '} {statusMessage}
				</p>
			{/if}
		</div>

		<button
			type="button"
			class="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
			onclick={handleSave}
			disabled={isLoading || isSaving}
		>
			{#if isSaving}
				<span>Menyimpan...</span>
			{:else}
				<span>Simpan Pengaturan Sensor</span>
			{/if}
		</button>
	</div>
</div>
