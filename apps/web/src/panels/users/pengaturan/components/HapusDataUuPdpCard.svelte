<script lang="ts">
	interface Props {
		businessName?: string;
		onConfirmErasure?: () => void;
	}

	let { businessName = 'Warung Bu Rina', onConfirmErasure }: Props = $props();

	let isModalOpen = $state(false);
	let confirmationInput = $state('');

	let targetConfirmationText = $derived(`HAPUS ${businessName.toUpperCase()}`);
	let isConfirmed = $derived(confirmationInput.trim() === targetConfirmationText);

	function openModal() {
		confirmationInput = '';
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		confirmationInput = '';
	}

	function handleExecute() {
		if (!isConfirmed) return;
		onConfirmErasure?.();
		closeModal();
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Hapus data saya · UU PDP
	</h2>

	<div class="space-y-2">
		<h3 class="text-xs sm:text-sm font-semibold text-[#111111]">
			Tindakan sensitif — bukan tombol simpan.
		</h3>
		<p class="text-xs text-[#4B5563] leading-relaxed">
			Penghapusan menghilangkan profil usaha, riwayat chat, entri pengetahuan, transaksi, serta dokumen dari akun Meseid. Bot berhenti dan koneksi kanal dicabut. Data yang sudah dihapus tidak bisa dipulihkan.
		</p>
		<p class="text-xs text-[#6B7280]">
			Salinan yang sudah diunduh atau disimpan di layanan pihak ketiga perlu Anda kelola terpisah. Kewajiban penyimpanan tertentu dijelaskan saat peninjauan permintaan.
		</p>
	</div>

	<!-- Callout Warning -->
	<div class="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3.5 text-xs text-[#166534] leading-relaxed">
		Sebelum melanjutkan: ekspor data yang masih dibutuhkan. Langkah berikutnya meminta verifikasi Owner dan konfirmasi dengan mengetik "{targetConfirmationText}".
	</div>

	<!-- Action Button -->
	<div class="pt-1">
		<button
			type="button"
			onclick={openModal}
			class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
		>
			Tinjau penghapusan data
		</button>
	</div>

	<!-- Modal Konfirmasi Hapus Data UU PDP -->
	{#if isModalOpen}
		<div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
			<button
				type="button"
				class="fixed inset-0 w-full h-full cursor-default bg-transparent border-0"
				onclick={closeModal}
				aria-label="Tutup dialog"
			></button>

			<div
				class="relative z-10 bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex items-start justify-between pb-2 border-b border-[#F3F4F6]">
					<div>
						<h3 class="text-base font-semibold text-red-600">
							Konfirmasi Pemusnahan Data (UU PDP)
						</h3>
						<p class="text-xs text-[#6B7280] mt-0.5">
							Prosedur ini akan memanggil fungsi kanonikal delete_owner_data().
						</p>
					</div>
					<button
						type="button"
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
					>
						&times;
					</button>
				</div>

				<div class="space-y-3 text-xs text-[#4B5563] leading-relaxed">
					<p>
						Untuk melanjutkan penghapusan akun <strong>{businessName}</strong> secara permanen, ketik teks konfirmasi berikut:
					</p>
					<div class="p-2.5 bg-gray-100 rounded-lg font-mono text-center font-bold text-[#111111] select-all">
						{targetConfirmationText}
					</div>
					<input
						type="text"
						bind:value={confirmationInput}
						placeholder="Ketik teks di atas di sini..."
						class="w-full px-3.5 py-2 text-xs font-mono bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-red-500"
					/>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
					<button
						type="button"
						onclick={closeModal}
						class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-gray-50 cursor-pointer"
					>
						Batal
					</button>
					<button
						type="button"
						onclick={handleExecute}
						disabled={!isConfirmed}
						class="px-4 py-2 text-xs font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
					>
						Hapus Data Permanen
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
