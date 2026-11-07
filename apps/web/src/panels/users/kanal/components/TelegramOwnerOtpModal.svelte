<script lang="ts">
	import { verifyOwnerTelegramOtp } from '../kanal-bot.service';

	interface Props {
		isOpen: boolean;
		botUsername?: string;
		onClose: () => void;
		onSuccess: (chatId?: string) => void;
	}

	let { isOpen, botUsername = '', onClose, onSuccess }: Props = $props();

	let otpCode = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	let cleanUsername = $derived(botUsername.replace(/^@/, '') || 'EnB9e_bot');

	$effect(() => {
		if (isOpen) {
			otpCode = '';
			errorMessage = '';
			isSubmitting = false;
		}
	});

	async function handleSubmit() {
		errorMessage = '';
		const cleanOtp = otpCode.trim();
		if (cleanOtp.length !== 6) {
			errorMessage = 'Kode OTP harus berupa 6 digit angka.';
			return;
		}

		isSubmitting = true;
		try {
			const res = await verifyOwnerTelegramOtp(cleanOtp);
			if (res.success) {
				onSuccess(res.chatId);
				onClose();
			} else {
				errorMessage = res.error || 'Kode OTP Telegram tidak valid atau sudah kedaluwarsa.';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Kesalahan jaringan saat memverifikasi kode Telegram.';
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
				<h3 class="text-base font-intel font-semibold text-[#111111]">
					Tautkan Akun Owner Telegram
				</h3>
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

			<div class="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-inter text-[#166534] space-y-1.5 leading-relaxed">
				<div class="font-semibold text-[#15803D]">Langkah Verifikasi Telegram:</div>
				<ol class="list-decimal list-inside space-y-1 text-[11px] text-[#166534]">
					<li>
						Buka bot di Telegram:
						<a
							href="https://t.me/{cleanUsername}"
							target="_blank"
							rel="noreferrer"
							class="underline font-semibold text-[#0E6B2B]"
						>
							@{cleanUsername}
						</a>
					</li>
					<li>
						Ketik dan kirim perintah <code class="px-1.5 py-0.5 bg-white border border-[#BBF7D0] rounded font-mono font-bold text-[#0E6B2B]">/otp</code>
					</li>
					<li>Salin 6 digit kode OTP rahasia yang dikirimkan bot ke obrolan Anda.</li>
					<li>Masukkan kode tersebut ke kolom di bawah ini.</li>
				</ol>
			</div>

			<div class="space-y-1.5">
				<label for="tg-otp-input" class="block text-xs font-intel font-medium text-[#111111]">
					Kode OTP Telegram (6 Digit)
				</label>
				<input
					id="tg-otp-input"
					type="text"
					maxlength="6"
					bind:value={otpCode}
					placeholder="000000"
					class="w-full px-3.5 py-2.5 text-center tracking-[0.5em] bg-white border border-[#E5E7EB] rounded-xl text-lg font-mono font-bold text-[#111111] focus:outline-none focus:border-[#0E6B2B]"
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
					disabled={otpCode.trim().length !== 6 || isSubmitting}
					class="px-4 py-2 text-xs font-intel font-medium text-white bg-[#0E6B2B] hover:bg-[#0A4D1F] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
				>
					{isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Tautkan'}
				</button>
			</div>
		</div>
	</div>
{/if}
