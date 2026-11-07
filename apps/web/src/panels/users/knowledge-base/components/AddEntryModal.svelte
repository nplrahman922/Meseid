<script lang="ts">
	import type { NewEntryPayload } from '../knowledge-base.types';

	interface Props {
		isOpen?: boolean;
		initialTitle?: string;
		initialCategory?: string;
		initialContent?: string;
		initialIsInternal?: boolean;
		availableCategories?: string[];
		onSave?: (payload: NewEntryPayload) => Promise<void> | void;
		onClose?: () => void;
	}

	let {
		isOpen = false,
		initialTitle = '',
		initialCategory = 'Produk / Harga',
		initialContent = '',
		initialIsInternal = false,
		availableCategories = ['Produk / Harga', 'Jam operasional', 'Produk', 'FAQ', 'Kebijakan'],
		onSave,
		onClose
	}: Props = $props();

	let title = $state('');
	let category = $state('Produk / Harga');
	let customCategory = $state('');
	let isCustomCat = $state(false);
	let content = $state('');
	let isInternal = $state(false);
	let isSaving = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		if (isOpen) {
			title = initialTitle;
			content = initialContent;
			isInternal = initialIsInternal ?? false;
			errorMessage = '';
			isSaving = false;

			const cat = initialCategory || 'Produk / Harga';
			if (availableCategories.includes(cat)) {
				category = cat;
				isCustomCat = false;
				customCategory = '';
			} else {
				category = 'Lainnya';
				isCustomCat = true;
				customCategory = cat;
			}
		}
	});

	function handleCategoryChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		category = val;
		if (val === 'Lainnya') {
			isCustomCat = true;
		} else {
			isCustomCat = false;
			customCategory = '';
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim() || !content.trim()) return;

		const finalCategory = isCustomCat
			? customCategory.trim() || 'Umum'
			: category.trim();

		isSaving = true;
		errorMessage = '';
		try {
			if (onSave) {
				await onSave({
					title: title.trim(),
					category: finalCategory,
					content: content.trim(),
					is_internal: isInternal
				});
			}
			onClose?.();
		} catch (err: any) {
			errorMessage = err.message || 'Gagal menyimpan entri.';
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-lg bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5 shadow-xl">
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
				<h3 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
					{initialTitle ? 'Edit Entri Pengetahuan' : 'Tambah Entri Pengetahuan Baru'}
				</h3>
				<button
					type="button"
					onclick={onClose}
					disabled={isSaving}
					class="text-[#9CA3AF] hover:text-[#111111] text-lg font-bold p-1 cursor-pointer"
				>
					✕
				</button>
			</div>

			{#if errorMessage}
				<div class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-inter">
					{errorMessage}
				</div>
			{/if}

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4 text-xs font-intel">
				<!-- Title / Question -->
				<div class="space-y-1.5">
					<label for="entry-title" class="block font-medium text-[#111111]">
						Judul / Pertanyaan
					</label>
					<input
						id="entry-title"
						type="text"
						bind:value={title}
						required
						placeholder="Contoh: Jam buka warung"
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
					/>
				</div>

				<!-- Category -->
				<div class="space-y-1.5">
					<label for="entry-category" class="block font-medium text-[#111111]">
						Kategori
					</label>
					<select
						id="entry-category"
						value={category}
						onchange={handleCategoryChange}
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none"
					>
						{#each availableCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
						<option value="Lainnya">+ Buat Kategori Baru...</option>
					</select>
					{#if isCustomCat}
						<input
							type="text"
							bind:value={customCategory}
							required
							placeholder="Tuliskan nama kategori baru..."
							class="w-full mt-2 px-3.5 py-2 bg-white border border-[#0E6B2B] rounded-xl text-xs font-intel text-[#111111] focus:outline-none"
						/>
					{/if}
				</div>

				<!-- Content / Answer -->
				<div class="space-y-1.5">
					<label for="entry-content" class="block font-medium text-[#111111]">
						Jawaban / Detail Info
					</label>
					<textarea
						id="entry-content"
						rows="4"
						bind:value={content}
						required
						placeholder="Tuliskan jawaban yang benar untuk dipakai bot menjawab pembeli..."
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
					></textarea>
				</div>

				<!-- Internal / Confidential Toggle -->
				<div class="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-[#E5E7EB]">
					<input
						id="entry-internal"
						type="checkbox"
						bind:checked={isInternal}
						class="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#0E6B2B] focus:ring-[#0E6B2B] cursor-pointer"
					/>
					<label for="entry-internal" class="text-xs font-intel text-[#374151] cursor-pointer">
						<span class="font-medium text-[#111111]">Hanya untuk Asisten Bisnis (Internal / Rahasia)</span>
						<p class="text-[11px] text-[#6B7280] leading-snug mt-0.5">
							Jika dicentang, bot toko tidak akan memberikan jawaban ini ke pelanggan umum (hanya dipakai saat berkonsultasi dengan Owner).
						</p>
					</label>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
					<button
						type="button"
						onclick={onClose}
						disabled={isSaving}
						class="px-4 py-2 text-xs sm:text-sm font-intel text-[#4B5563] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSaving}
						class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] disabled:opacity-50 rounded-xl cursor-pointer shadow-xs"
					>
						{isSaving ? 'Menyimpan...' : 'Simpan Entri'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
