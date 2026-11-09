<script lang="ts">
	import type { ScheduleException } from '../jam-operasional.types';

	interface Props {
		isOpen: boolean;
		editingException?: ScheduleException | null;
		onClose: () => void;
		onSave: (exception: ScheduleException) => void;
	}

	let { isOpen, editingException = null, onClose, onSave }: Props = $props();

	let date = $state('');
	let reason = $state('');
	let isClosedAllDay = $state(true);
	let openTime = $state('08:00');
	let closeTime = $state('14:00');
	let errorMsg = $state('');

	$effect(() => {
		if (isOpen) {
			errorMsg = '';
			if (editingException) {
				date = editingException.date || '';
				reason = editingException.reason || '';
				isClosedAllDay = editingException.isClosedAllDay ?? true;
				openTime = editingException.openTime || '08:00';
				closeTime = editingException.closeTime || '14:00';
			} else {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				date = tomorrow.toISOString().split('T')[0];
				reason = '';
				isClosedAllDay = true;
				openTime = '08:00';
				closeTime = '14:00';
			}
		}
	});

	function formatDateLabel(isoDate: string): string {
		try {
			const parts = isoDate.split('-');
			const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
			return new Intl.DateTimeFormat('id-ID', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}).format(d);
		} catch {
			return isoDate;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!date) {
			errorMsg = 'Pilih tanggal pengecualian terlebih dahulu.';
			return;
		}
		if (!reason.trim()) {
			errorMsg = 'Keterangan libur/pengecualian wajib diisi.';
			return;
		}

		const item: ScheduleException = {
			id: editingException?.id || `exc_${Date.now()}`,
			date,
			dateLabel: formatDateLabel(date),
			reason: isClosedAllDay
				? `${reason.trim()} · Warung tutup sepanjang hari`
				: `${reason.trim()} · Buka sebagian jam (${openTime}–${closeTime})`,
			isClosedAllDay,
			openTime: isClosedAllDay ? null : openTime,
			closeTime: isClosedAllDay ? null : closeTime
		};

		onSave(item);
		onClose();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
		<div class="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md p-6 shadow-xl space-y-5">
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
				<h3 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
					{editingException ? 'Edit Pengecualian Tanggal' : 'Tambah Pengecualian Tanggal'}
				</h3>
				<button
					type="button"
					aria-label="Tutup Modal"
					onclick={onClose}
					class="text-[#9CA3AF] hover:text-[#111111] transition-colors cursor-pointer text-lg"
				>
					✕
				</button>
			</div>

			{#if errorMsg}
				<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-inter">
					{errorMsg}
				</div>
			{/if}

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Tanggal -->
				<div class="space-y-1.5">
					<label for="exception-date-input" class="block text-xs font-intel font-medium text-[#111111]">
						Tanggal Pengecualian
					</label>
					<input
						id="exception-date-input"
						type="date"
						bind:value={date}
						required
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
					/>
				</div>

				<!-- Alasan -->
				<div class="space-y-1.5">
					<label for="exception-reason-input" class="block text-xs font-intel font-medium text-[#111111]">
						Keterangan Libur / Acara
					</label>
					<input
						id="exception-reason-input"
						type="text"
						bind:value={reason}
						placeholder="Misal: Libur Idul Fitri / Acara Keluarga"
						required
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
					/>
				</div>

				<!-- Toggle Tutup Sepanjang Hari -->
				<div class="p-3 rounded-xl border border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
					<span class="text-xs font-intel text-[#111111]">Tutup sepanjang hari</span>
					<button
						type="button"
						aria-label="Toggle Tutup Sepanjang Hari"
						onclick={() => (isClosedAllDay = !isClosedAllDay)}
						class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {isClosedAllDay ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
					>
						<span
							class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {isClosedAllDay ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
						></span>
					</button>
				</div>

				<!-- Jam Khusus (Jika Buka Sebagian Hari) -->
				{#if !isClosedAllDay}
					<div class="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
						<input
							type="time"
							bind:value={openTime}
							class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-center text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
						/>
						<span class="text-xs text-[#6B7280]">sampai</span>
						<input
							type="time"
							bind:value={closeTime}
							class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-center text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
						/>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
					<button
						type="button"
						onclick={onClose}
						class="px-4 py-2 text-xs font-intel font-medium text-[#4B5563] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-xl transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 text-xs font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] rounded-xl transition-colors cursor-pointer shadow-xs"
					>
						Simpan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
