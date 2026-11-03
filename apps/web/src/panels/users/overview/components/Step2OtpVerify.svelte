<script lang="ts">
	interface Props {
		otpDigits: string[];
		otpError?: string;
		isVerifying: boolean;
		isOtpComplete: boolean;
		resendCountdown: number;
		dialCode: string;
		cleanPhone: string;
		onOtpInput: (index: number, e: Event) => void;
		onOtpKeydown: (index: number, e: KeyboardEvent) => void;
		onVerify: () => void;
		onResend: () => void;
		onChangePhone: () => void;
	}

	let {
		otpDigits,
		otpError = '',
		isVerifying,
		isOtpComplete,
		resendCountdown,
		dialCode,
		cleanPhone,
		onOtpInput,
		onOtpKeydown,
		onVerify,
		onResend,
		onChangePhone
	}: Props = $props();

	let otpInputs: Array<HTMLInputElement | undefined> = [];

	export function focusFirst() {
		otpInputs[0]?.focus();
	}

	export function focusIndex(index: number) {
		otpInputs[index]?.focus();
	}
</script>

<div class="w-full max-w-md sm:max-w-lg px-4 sm:px-0 flex flex-col items-center mb-8">
	<!-- Segmented 6-Digit OTP Inputs -->
	<div class="flex items-center justify-center gap-2 sm:gap-3 mb-6 w-full">
		{#each otpDigits as digit, index}
			<input
				type="text"
				inputmode="numeric"
				maxlength="6"
				value={digit}
				bind:this={otpInputs[index]}
				oninput={(e) => onOtpInput(index, e)}
				onkeydown={(e) => onOtpKeydown(index, e)}
				class="w-11 h-14 sm:w-13 sm:h-16 text-xl sm:text-2xl font-bold font-intel text-center rounded-2xl border bg-white transition-all outline-none focus:outline-none select-all {
					digit
						? 'border-[#5FD068] ring-2 ring-[#5FD068]/20 text-[#111111]'
						: 'border-neutral-300 text-neutral-400 focus:border-[#5FD068] focus:ring-2 focus:ring-[#5FD068]/20'
				}"
				aria-label={`OTP digit ${index + 1}`}
			/>
		{/each}
	</div>

	{#if otpError}
		<p class="text-xs text-red-500 mb-3 text-center">{otpError}</p>
	{/if}

	<!-- Primary Action Button: Verify & Continue -->
	<button
		type="button"
		onclick={onVerify}
		disabled={!isOtpComplete || isVerifying}
		class="w-full py-4 px-6 rounded-2xl text-white font-medium text-base shadow-xs transition-all flex items-center justify-center gap-2 mb-4 {
			isOtpComplete && !isVerifying
				? 'bg-[#5FD068] hover:bg-[#52c847] hover:shadow-md cursor-pointer active:scale-[0.99]'
				: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
		}"
	>
		{#if isVerifying}
			<span>Verifying...</span>
		{:else}
			<span>Verify &amp; Continue</span>
			<span>&rarr;</span>
		{/if}
	</button>

	<!-- Resend Timer & Change Phone Link -->
	<div class="flex flex-col items-center gap-1.5 text-xs text-neutral-500">
		{#if resendCountdown > 0}
			<p>Resend code in <span class="font-medium text-neutral-800">00:{resendCountdown < 10 ? '0' : ''}{resendCountdown}</span></p>
		{:else}
			<button
				type="button"
				onclick={onResend}
				class="text-[#5FD068] hover:underline font-medium cursor-pointer"
			>
				Resend Verification Code
			</button>
		{/if}

		<button
			type="button"
			onclick={onChangePhone}
			class="text-neutral-400 hover:text-neutral-700 underline mt-1 cursor-pointer"
		>
			&larr; Change phone number
		</button>
	</div>
</div>
