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

	function applyPreset(domain: 'kuliner' | 'fashion' | 'bengkel') {
		if (domain === 'kuliner') {
			title = 'Daftar Menu & Jam Operasional Warung';
			category = 'Produk / Harga';
			content = '• Nasi Ayam Geprek Sambal Korek: Rp 22.000 / porsi\n• Paket Bebek Goreng Sambal Ijo: Rp 32.000 / porsi\n• Es Teh Manis: Rp 5.000\n• Jam Operasional: Setiap hari 09:00 - 21:00 WIB\n• Gratis ongkir minimal Rp 50.000 dalam radius 2 km.';
		} else if (domain === 'fashion') {
			title = 'Katalog Busana Muslim & Kebijakan Retur';
			category = 'Produk / Harga';
			content = '• Gamis Rayon Viscose Silk: Rp 165.000 (All size LD 110cm, Busui friendly)\n• Pashmina Ceruty Baby Doll: Rp 45.000\n• Khimar Syari 2 Layer: Rp 85.000\n• Garansi Tukar Size: Maksimal 3 hari sejak barang diterima (tag utuh)\n• Jam Buka: Senin - Sabtu 08:30 - 17:30 WIB.';
		} else if (domain === 'bengkel') {
			title = 'Tarif Jasa Servis & Suku Cadang Motor';
			category = 'Produk / Harga';
			content = '• Servis Ringan + Tune-up Injeksi: Rp 45.000\n• Paket Servis Lengkap + CVT Matic: Rp 75.000\n• Ganti Oli Honda MPX2: Rp 55.000 (Gratis jasa ganti)\n• Garansi Servis: 14 hari keluhan yang sama (bawa nota)\n• Buka: Setiap hari 08:00 - 17:00 WIB.';
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

			<!-- Quick Preset Buttons -->
			{#if !initialTitle}
				<div class="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-1.5">
					<div class="text-[11px] font-intel text-[#6B7280]">
						💡 Baru mulai? Gunakan preset contoh template usaha:
					</div>
					<div class="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onclick={() => applyPreset('kuliner')}
							class="px-2.5 py-1 text-[11px] font-intel bg-white border border-[#D1D5DB] hover:border-[#0E6B2B] text-[#111111] rounded-lg cursor-pointer"
						>
							🍜 Kuliner Warung
						</button>
						<button
							type="button"
							onclick={() => applyPreset('fashion')}
							class="px-2.5 py-1 text-[11px] font-intel bg-white border border-[#D1D5DB] hover:border-[#0E6B2B] text-[#111111] rounded-lg cursor-pointer"
						>
							👗 Butik Hijab
						</button>
						<button
							type="button"
							onclick={() => applyPreset('bengkel')}
							class="px-2.5 py-1 text-[11px] font-intel bg-white border border-[#D1D5DB] hover:border-[#0E6B2B] text-[#111111] rounded-lg cursor-pointer"
						>
							🔧 Bengkel Motor
						</button>
					</div>
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
