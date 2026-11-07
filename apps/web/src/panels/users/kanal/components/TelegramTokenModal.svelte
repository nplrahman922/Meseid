<script lang="ts">
	import { verifyTelegramToken } from '../kanal-bot.service';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSuccess: (data: { botId: string; username: string }) => void;
	}

	let { isOpen, onClose, onSuccess }: Props = $props();

	let token = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		if (isOpen) {
			token = '';
			errorMessage = '';
			isSubmitting = false;
		}
	});

	async function handleSubmit() {
		if (!token.trim() || isSubmitting) return;
		isSubmitting = true;
		errorMessage = '';

		try {
			const res = await verifyTelegramToken(token.trim());
			if (res.success && res.botId && res.username) {
				onSuccess({ botId: res.botId, username: res.username });
				onClose();
			} else {
				errorMessage = res.error || 'Token bot Telegram tidak valid.';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Terjadi kesalahan saat memverifikasi token.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
	>
		<button
			type="button"
			class="fixed inset-0 w-full h-full cursor-default bg-transparent -z-10"
			onclick={onClose}
			aria-label="Tutup"
		></button>

		<div class="relative w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xl space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-base font-intel font-semibold text-[#111111]">Ganti Token Bot Telegram</h3>
				<button
					type="button"
					onclick={onClose}
					class="p-1 text-[#9CA3AF] hover:text-[#111111] rounded-lg transition-colors cursor-pointer"
					aria-label="Tutup modal"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<p class="text-xs font-inter text-[#4B5563] leading-relaxed">
				Dapatkan token baru dari <span class="font-semibold text-[#111111]">@BotFather</span> di Telegram, lalu tempelkan di bawah ini.
			</p>

			<div class="space-y-1.5">
				<label for="new-tg-token" class="block text-xs font-intel font-medium text-[#111111]">
					Token Bot Baru
				</label>
				<input
					id="new-tg-token"
					type="text"
					bind:value={token}
					placeholder="Contoh: 1234567890:ABCdefGHIjklMNOpqr..."
					class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:border-[#0E6B2B]"
				/>
			</div>

			{#if errorMessage}
				<div class="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs font-inter text-[#EF4444]">
					{errorMessage}
				</div>
			{/if}

			<div class="flex items-center justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={onClose}
					disabled={isSubmitting}
					class="px-4 py-2 text-xs font-intel font-medium text-[#4B5563] hover:text-[#111111] transition-colors cursor-pointer"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={handleSubmit}
					disabled={!token.trim() || isSubmitting}
					class="px-4 py-2 text-xs font-intel font-medium text-white bg-[#0E6B2B] hover:bg-[#0A4D1F] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
				>
					{isSubmitting ? 'Memverifikasi...' : 'Simpan & Tautkan'}
				</button>
			</div>
		</div>
	</div>
{/if}
