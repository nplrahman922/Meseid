<script lang="ts">
	interface Props {
		isOpen?: boolean;
		entryTitle?: string;
		onConfirm?: () => Promise<void> | void;
		onClose?: () => void;
	}

	let { isOpen = false, entryTitle = '', onConfirm, onClose }: Props = $props();
	let isDeleting = $state(false);

	async function handleConfirm() {
		if (isDeleting) return;
		isDeleting = true;
		try {
			if (onConfirm) {
				await onConfirm();
			}
			onClose?.();
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-xl">
			<!-- Header -->
			<div class="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
				<h3 class="text-base font-intel font-medium text-red-600 flex items-center gap-2">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Hapus Entri Pengetahuan
				</h3>
				<button
					type="button"
					onclick={onClose}
					class="text-[#9CA3AF] hover:text-[#111111] text-lg font-bold p-1 cursor-pointer"
				>
					✕
				</button>
			</div>

			<!-- Body -->
			<div class="text-xs font-inter text-[#4B5563] space-y-2">
				<p>
					Apakah Anda yakin ingin menghapus entri berikut dari Knowledge Base?
				</p>
				<p class="font-medium text-[#111111] bg-gray-50 p-2.5 rounded-xl border border-gray-200">
					"{entryTitle}"
				</p>
				<p class="text-[11px] text-[#6B7280]">
					Setelah dihapus, bot AI tidak akan lagi menggunakan informasi ini saat menjawab pesan.
				</p>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
				<button
					type="button"
					onclick={onClose}
					disabled={isDeleting}
					class="px-4 py-2 text-xs sm:text-sm font-intel text-[#4B5563] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={isDeleting}
					class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl cursor-pointer shadow-xs"
				>
					{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
				</button>
			</div>
		</div>
	</div>
{/if}
