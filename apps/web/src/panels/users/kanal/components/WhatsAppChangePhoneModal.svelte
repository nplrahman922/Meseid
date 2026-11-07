<script lang="ts">
	import { onDestroy } from 'svelte';
	import { sendOwnerWhatsappOtp, verifyOwnerWhatsappOtp } from '../kanal-bot.service';

	interface Props {
		isOpen: boolean;
		currentPhone?: string | null;
		onClose: () => void;
		onSuccess: (newPhone: string) => void;
	}

	let { isOpen, currentPhone = null, onClose, onSuccess }: Props = $props();

	let step = $state<'input_phone' | 'input_otp'>('input_phone');
	let phoneInput = $state('');
	let otpCode = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let countdown = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (isOpen) {
			step = 'input_phone';
			phoneInput = currentPhone || '';
			otpCode = '';
			errorMessage = '';
			isSubmitting = false;
			stopCountdown();
		} else {
			stopCountdown();
		}
	});

	onDestroy(() => {
		stopCountdown();
	});

	function startCountdown(seconds = 60) {
		stopCountdown();
		countdown = seconds;
		timerInterval = setInterval(() => {
			if (countdown > 0) {
				countdown -= 1;
			} else {
				stopCountdown();
			}
		}, 1000);
	}

	function stopCountdown() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function normalizePhoneInput(raw: string): string {
		let digits = raw.replace(/\D/g, '');
		if (digits.startsWith('0')) digits = '62' + digits.slice(1);
		if (!digits.startsWith('62') && digits.length >= 9) digits = '62' + digits;
		return digits;
	}

	async function handleSendOtp() {
		errorMessage = '';
		const normalized = normalizePhoneInput(phoneInput);
		if (normalized.length < 10) {
			errorMessage = 'Nomor WhatsApp tidak valid. Masukkan minimal 10 digit angka.';
			return;
		}

		isSubmitting = true;
		try {
			const res = await sendOwnerWhatsappOtp(normalized);
			if (res.success) {
				step = 'input_otp';
				startCountdown(60);
			} else {
				errorMessage = res.error || 'Gagal mengirimkan kode OTP WhatsApp.';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Kesalahan jaringan saat mengirimkan OTP.';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleVerifyOtp() {
		errorMessage = '';
		const cleanOtp = otpCode.trim();
		if (cleanOtp.length !== 6) {
			errorMessage = 'Kode OTP harus berupa 6 digit angka.';
			return;
		}

		isSubmitting = true;
		try {
			const normalized = normalizePhoneInput(phoneInput);
			const res = await verifyOwnerWhatsappOtp(normalized, cleanOtp);
			if (res.success) {
				onSuccess(normalized);
				onClose();
			} else {
				errorMessage = res.error || 'Kode OTP salah atau sudah kedaluwarsa.';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Kesalahan jaringan saat memverifikasi OTP.';
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
					{step === 'input_phone' ? 'Atur Nomor WhatsApp Owner' : 'Verifikasi Kode OTP'}
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

			{#if step === 'input_phone'}
				<p class="text-xs font-inter text-[#4B5563] leading-relaxed">
					Masukkan nomor WhatsApp pribadi Anda. Bot akan mengirimkan 6 digit kode verifikasi untuk memvalidasi kepemilikan.
				</p>

				{#if currentPhone}
					<div class="text-[11px] font-intel text-[#6B7280] bg-[#F9FAFB] p-2.5 rounded-xl border border-[#E5E7EB]">
						Nomor aktif saat ini: <span class="font-semibold text-[#111111]">+{currentPhone}</span>
					</div>
				{/if}

				<div class="space-y-1.5">
					<label for="wa-owner-phone-input" class="block text-xs font-intel font-medium text-[#111111]">
						Nomor WhatsApp Baru
					</label>
					<input
						id="wa-owner-phone-input"
						type="tel"
						bind:value={phoneInput}
						placeholder="Contoh: 081234567890 atau 6281234567890"
						class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel text-[#111111] focus:outline-none focus:border-[#0E6B2B]"
					/>
				</div>
			{:else}
				<p class="text-xs font-inter text-[#4B5563] leading-relaxed">
					Kode OTP 6-digit telah dikirimkan ke WhatsApp nomor <span class="font-semibold text-[#111111]">+{normalizePhoneInput(phoneInput)}</span>.
				</p>

				<div class="space-y-1.5">
					<label for="wa-otp-code-input" class="block text-xs font-intel font-medium text-[#111111]">
						Kode Verifikasi (6 Digit)
					</label>
					<input
						id="wa-otp-code-input"
						type="text"
						maxlength="6"
						bind:value={otpCode}
						placeholder="000000"
						class="w-full px-3.5 py-2.5 text-center tracking-[0.5em] bg-white border border-[#E5E7EB] rounded-xl text-lg font-mono font-bold text-[#111111] focus:outline-none focus:border-[#0E6B2B]"
					/>
				</div>

				<div class="flex items-center justify-between text-xs font-intel">
					<button
						type="button"
						onclick={() => (step = 'input_phone')}
						class="text-[#4B5563] hover:text-[#111111] underline cursor-pointer"
					>
						Ubah nomor
					</button>

					{#if countdown > 0}
						<span class="text-[#9CA3AF]">Kirim ulang dalam {countdown}s</span>
					{:else}
						<button
							type="button"
							onclick={handleSendOtp}
							disabled={isSubmitting}
							class="text-[#0E6B2B] hover:text-[#0A4D1F] font-medium underline cursor-pointer"
						>
							Kirim ulang OTP
						</button>
					{/if}
				</div>
			{/if}

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

				{#if step === 'input_phone'}
					<button
						type="button"
						onclick={handleSendOtp}
						disabled={!phoneInput.trim() || isSubmitting}
						class="px-4 py-2 text-xs font-intel font-medium text-white bg-[#0E6B2B] hover:bg-[#0A4D1F] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
					>
						{isSubmitting ? 'Mengirim...' : 'Kirim Kode OTP'}
					</button>
				{:else}
					<button
						type="button"
						onclick={handleVerifyOtp}
						disabled={otpCode.trim().length !== 6 || isSubmitting}
						class="px-4 py-2 text-xs font-intel font-medium text-white bg-[#0E6B2B] hover:bg-[#0A4D1F] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
					>
						{isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Simpan'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
