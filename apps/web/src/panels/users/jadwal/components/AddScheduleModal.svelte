<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSubmit: (data: {
			title: string;
			start_at: string;
			end_at: string;
			description?: string;
		}) => Promise<void>;
	}

	let { isOpen, onClose, onSubmit }: Props = $props();

	let title = $state('');
	let dateStr = $state(new Date().toISOString().slice(0, 10));
	let startTime = $state('10:00');
	let endTime = $state('11:00');
	let description = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = '';

		if (!title.trim()) {
			errorMessage = 'Judul agenda tidak boleh kosong.';
			return;
		}

		const startIso = `${dateStr}T${startTime}:00`;
		const endIso = `${dateStr}T${endTime}:00`;

		if (new Date(endIso) <= new Date(startIso)) {
			errorMessage = 'Jam selesai harus lebih lambat dari jam mulai.';
			return;
		}

		try {
			isSubmitting = true;
			await onSubmit({
				title: title.trim(),
				start_at: new Date(startIso).toISOString(),
				end_at: new Date(endIso).toISOString(),
				description: description.trim() || undefined,
			});
			// Reset
			title = '';
			description = '';
			onClose();
		} catch (err: any) {
			errorMessage = err.message || 'Gagal menyimpan agenda.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
		<div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl w-full max-w-md p-6 space-y-5">
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
				<h3 class="text-base font-semibold text-[#111111]">
					Tambah Jadwal Baru
				</h3>
				<button
					type="button"
					onclick={onClose}
					class="text-[#9CA3AF] hover:text-[#111111] transition-colors p-1"
				>
					✕
				</button>
			</div>

			<!-- Error Alert -->
			{#if errorMessage}
				<div class="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
					{errorMessage}
				</div>
			{/if}

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-1.5">
					<label for="sched-title" class="block text-xs font-medium text-[#374151]">
						Nama Agenda / Acara
					</label>
					<input
						id="sched-title"
						type="text"
						bind:value={title}
						placeholder="Contoh: Rapat Koordinasi Suplier"
						required
						class="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D1D5DB] focus:outline-hidden focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="sched-date" class="block text-xs font-medium text-[#374151]">
						Tanggal
					</label>
					<input
						id="sched-date"
						type="date"
						bind:value={dateStr}
						required
						class="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D1D5DB] focus:outline-hidden focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<label for="sched-start" class="block text-xs font-medium text-[#374151]">
							Jam Mulai
						</label>
						<input
							id="sched-start"
							type="time"
							bind:value={startTime}
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D1D5DB] focus:outline-hidden focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="sched-end" class="block text-xs font-medium text-[#374151]">
							Jam Selesai
						</label>
						<input
							id="sched-end"
							type="time"
							bind:value={endTime}
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D1D5DB] focus:outline-hidden focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
						/>
					</div>
				</div>

				<div class="space-y-1.5">
					<label for="sched-desc" class="block text-xs font-medium text-[#374151]">
						Catatan (Opsional)
					</label>
					<textarea
						id="sched-desc"
						bind:value={description}
						rows={2}
						placeholder="Catatan tambahan agenda..."
						class="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D1D5DB] focus:outline-hidden focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
					></textarea>
				</div>

				<!-- Actions -->
				<div class="pt-3 flex items-center justify-end gap-2 border-t border-[#F3F4F6]">
					<button
						type="button"
						onclick={onClose}
						disabled={isSubmitting}
						class="px-4 py-2 text-xs font-medium text-[#374151] hover:bg-gray-100 rounded-xl transition-colors"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-4 py-2 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-colors disabled:opacity-60"
					>
						{isSubmitting ? 'Menyimpan...' : 'Simpan ke Jadwal'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
