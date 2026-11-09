<script lang="ts">
	import type { ConfirmedEvent } from '../jadwal.types';

	interface Props {
		isOpen: boolean;
		event: ConfirmedEvent | null;
		onClose: () => void;
		onDelete?: (id: string) => Promise<void> | void;
	}

	let { isOpen, event, onClose, onDelete }: Props = $props();

	let isDeleting = $state(false);

	async function handleDelete() {
		if (!event) return;
		if (!confirm(`Apakah Anda yakin ingin membatalkan/menghapus agenda "${event.title}"?`)) {
			return;
		}

		try {
			isDeleting = true;
			await onDelete?.(event.id);
			onClose();
		} catch (e) {
			console.error('Gagal menghapus agenda:', e);
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if isOpen && event}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
		<div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl w-full max-w-md p-6 space-y-5">
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
				<h3 class="text-base font-semibold text-[#111111]">
					Rincian Agenda
				</h3>
				<button
					type="button"
					onclick={onClose}
					class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
					aria-label="Tutup modal"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Event Title & Badges -->
			<div class="space-y-2">
				<h2 class="text-lg font-bold text-[#111111]">
					{event.title}
				</h2>

				<div class="flex flex-wrap items-center gap-1.5">
					<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
						Terkonfirmasi
					</span>

					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
						{event.type === 'order' ? 'Pesanan Pembeli' : event.type === 'holiday' ? 'Libur Toko' : 'Agenda Bisnis'}
					</span>

					{#if event.googleEventId}
						<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
							Google Calendar
						</span>
					{/if}
				</div>
			</div>

			<!-- Event Information Details -->
			<div class="bg-[#F9FAFB] rounded-xl p-4 space-y-3 text-xs font-mono border border-gray-100">
				<!-- Tanggal -->
				<div class="flex items-start gap-2.5">
					<span class="text-gray-400 font-sans text-sm">📅</span>
					<div>
						<div class="text-[#6B7280]">Tanggal:</div>
						<div class="font-semibold text-[#111111]">{event.dateText || '-'}</div>
					</div>
				</div>

				<!-- Waktu -->
				<div class="flex items-start gap-2.5">
					<span class="text-gray-400 font-sans text-sm">⏰</span>
					<div>
						<div class="text-[#6B7280]">Waktu:</div>
						<div class="font-semibold text-[#111111]">{event.timeRange || 'Sepanjang hari'}</div>
					</div>
				</div>

				<!-- Keterangan -->
				{#if event.note}
					<div class="flex items-start gap-2.5 pt-1 border-t border-gray-200/60">
						<span class="text-gray-400 font-sans text-sm">📝</span>
						<div>
							<div class="text-[#6B7280]">Keterangan:</div>
							<div class="text-[#374151]">{event.note}</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer Action Buttons -->
			<div class="pt-2 flex items-center justify-between gap-3 border-t border-[#F3F4F6]">
				<button
					type="button"
					onclick={handleDelete}
					disabled={isDeleting}
					class="px-3.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-red-200 disabled:opacity-50"
				>
					{isDeleting ? 'Menghapus...' : 'Batalkan Agenda'}
				</button>

				<button
					type="button"
					onclick={onClose}
					class="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
