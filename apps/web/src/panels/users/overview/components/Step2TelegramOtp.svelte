<script lang="ts">
	interface Props {
		telegramUsername?: string;
		onVerifyCode: (code: string) => Promise<{ success: boolean; error?: string }>;
		onBack: () => void;
		onSuccess: () => void;
	}

	let {
		telegramUsername = '',
		onVerifyCode,
		onBack,
		onSuccess
	}: Props = $props();

	let otpDigits = $state<string[]>(['', '', '', '', '', '']);
	let isVerifying = $state(false);
	let errorMessage = $state('');
	let copied = $state(false);

	let inputElements: Array<HTMLInputElement | undefined> = [];

	let isComplete = $derived(
		otpDigits.every((d) => d.trim().length === 1 && !isNaN(Number(d)))
	);

	let botLink = $derived(
		telegramUsername ? `https://t.me/${telegramUsername.replace(/^@/, '')}` : 'https://t.me'
	);

	function handleInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const val = target.value.replace(/[^0-9]/g, '');

		if (val.length > 1) {
			const digits = val.slice(0, 6).split('');
			digits.forEach((d, i) => {
				if (i < 6) otpDigits[i] = d;
			});
			const nextFocus = Math.min(digits.length, 5);
			inputElements[nextFocus]?.focus();
			if (otpDigits.every((d) => d.trim().length === 1)) {
				handleSubmit();
			}
			return;
		}

		otpDigits[index] = val ? val.slice(-1) : '';
		if (val && index < 5) {
			inputElements[index + 1]?.focus();
		}

		if (otpDigits.every((d) => d.trim().length === 1)) {
			handleSubmit();
		}
	}

	function handleKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			inputElements[index - 1]?.focus();
		} else if (e.key === 'Enter' && isComplete) {
			handleSubmit();
		}
	}

	function copyCommand() {
		navigator.clipboard.writeText('/otp');
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function handleSubmit() {
		if (!isComplete || isVerifying) return;
		isVerifying = true;
		errorMessage = '';

		try {
			const code = otpDigits.join('');
			const res = await onVerifyCode(code);
			if (res.success) {
				onSuccess();
			} else {
				errorMessage = res.error || 'Kode OTP Telegram tidak valid atau sudah kedaluwarsa.';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Terjadi kesalahan saat memverifikasi kode OTP.';
		} finally {
			isVerifying = false;
		}
	}
</script>

<div class="w-full max-w-md sm:max-w-lg px-4 sm:px-0 flex flex-col items-center mb-8 font-intel">
	<!-- Instruksi Step Card Telegram Inverted OTP -->
	<div class="w-full p-4 sm:p-5 rounded-2xl bg-[#EAF5F3] border border-[#65BAA9]/30 text-xs sm:text-sm text-[#1E4D45] mb-6 leading-relaxed">
		<strong class="font-semibold text-[#143B34] block mb-2 text-sm sm:text-base">
			Langkah Verifikasi Akun Telegram Owner:
		</strong>
		<ol class="list-decimal list-inside space-y-2 text-xs sm:text-sm">
			<li>
				Buka bot toko Anda di Telegram:
				<a
					href={botLink}
					target="_blank"
					rel="noreferrer"
					class="inline-flex items-center gap-1 font-semibold text-[#2E7D70] hover:underline ml-1"
				>
					<span>@{telegramUsername ? telegramUsername.replace(/^@/, '') : 'Bot'}</span>
					<span>&nearr;</span>
				</a>
			</li>
			<li class="flex items-center gap-1.5 flex-wrap">
				<span>Kirim perintah teks:</span>
				<code class="px-2 py-0.5 rounded bg-white border border-[#65BAA9]/40 font-mono text-xs font-bold text-[#143B34]">/otp</code>
				<button
					type="button"
					onclick={copyCommand}
					class="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-300 transition-colors cursor-pointer"
				>
					{copied ? 'Tersalin ✓' : 'Salin'}
				</button>
			</li>
			<li>Bot toko Anda akan membalas dengan <strong>6 digit kode OTP rahasia</strong>.</li>
		</ol>
	</div>

	<!-- 6 Kotak Input OTP (Telegram Teal Accent #65BAA9) -->
	<div class="flex items-center justify-center gap-2 sm:gap-3 mb-5 w-full">
		{#each otpDigits as digit, index}
			<input
				type="text"
				inputmode="numeric"
				maxlength="6"
				value={digit}
				bind:this={inputElements[index]}
				oninput={(e) => handleInput(index, e)}
				onkeydown={(e) => handleKeydown(index, e)}
				class="w-11 h-14 sm:w-13 sm:h-16 text-xl sm:text-2xl font-bold font-intel text-center rounded-2xl border bg-white transition-all outline-none focus:outline-none select-all {
					digit
						? 'border-[#65BAA9] ring-2 ring-[#65BAA9]/20 text-[#111111]'
						: 'border-neutral-300 text-neutral-400 focus:border-[#65BAA9] focus:ring-2 focus:ring-[#65BAA9]/20'
				}"
				aria-label={`Digit ke-${index + 1}`}
			/>
		{/each}
	</div>

	{#if errorMessage}
		<p class="text-xs text-red-500 mb-4 text-center">{errorMessage}</p>
	{/if}

	<!-- Tombol Verifikasi Akun Telegram -->
	<button
		type="button"
		onclick={handleSubmit}
		disabled={!isComplete || isVerifying}
		class="w-full py-4 px-6 rounded-2xl text-white font-medium text-base shadow-xs transition-all flex items-center justify-center gap-2 mb-4 {
			isComplete && !isVerifying
				? 'bg-[#65BAA9] hover:bg-[#58a394] hover:shadow-md cursor-pointer active:scale-[0.99]'
				: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
		}"
	>
		{#if isVerifying}
			<span>Memverifikasi Telegram...</span>
		{:else}
			<span>Verifikasi Akun Telegram Pemilik</span>
			<span>&rarr;</span>
		{/if}
	</button>

	<!-- Tombol Batal / Kembali ke Pemilihan Bot -->
	<button
		type="button"
		onclick={onBack}
		class="text-xs text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
	>
		&larr; Kembali ke Pilihan Bot
	</button>
</div>
