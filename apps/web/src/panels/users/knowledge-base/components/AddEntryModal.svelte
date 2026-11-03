<script lang="ts">
	import type { NewEntryPayload } from '../knowledge-base.types';

	interface Props {
		isOpen?: boolean;
		initialTitle?: string;
		initialCategory?: string;
		initialContent?: string;
		onSave?: (payload: NewEntryPayload) => void;
		onClose?: () => void;
	}

	let {
		isOpen = false,
		initialTitle = '',
		initialCategory = 'Produk / Harga',
		initialContent = '',
		onSave,
		onClose
	}: Props = $props();

	let title = $state('');
	let category = $state('Produk / Harga');
	let content = $state('');

	$effect(() => {
		if (isOpen) {
			title = initialTitle;
			category = initialCategory || 'Produk / Harga';
			content = initialContent;
		}
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim() || !content.trim()) return;
		if (onSave) {
			onSave({
				title: title.trim(),
				category: category.trim(),
				content: content.trim()
			});
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
					class="text-[#9CA3AF] hover:text-[#111111] text-lg font-bold p-1 cursor-pointer"
				>
					✕
				</button>
			</div>

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
						bind:value={category}
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none"
					>
						<option value="Produk / Harga">Produk / Harga</option>
						<option value="Jam operasional">Jam operasional</option>
						<option value="Produk">Produk</option>
						<option value="FAQ">FAQ</option>
						<option value="Kebijakan">Kebijakan</option>
					</select>
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

				<!-- Action Buttons -->
				<div class="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
					<button
						type="button"
						onclick={onClose}
						class="px-4 py-2 text-xs sm:text-sm font-intel text-[#4B5563] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] rounded-xl cursor-pointer shadow-xs"
					>
						Simpan Entri
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
