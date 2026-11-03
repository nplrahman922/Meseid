<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Step2TelegramModal from './Step2TelegramModal.svelte';
	import Step2WhatsappModal from './Step2WhatsappModal.svelte';
	import Step2TermsModal from './Step2TermsModal.svelte';
	import Step2BotsSelection from './Step2BotsSelection.svelte';
	import Step2PhoneInput, { COUNTRIES, type Country } from './Step2PhoneInput.svelte';
	import Step2OtpVerify from './Step2OtpVerify.svelte';
	import { sendOtpCode, verifyOtpCode, fetchWhatsappStatus } from '../overviewService';

	interface Props {
		initialAgreed?: boolean;
		initialTelegramToken?: string;
		initialWhatsappConnected?: boolean;
		initialPhone?: string;
		initialPhoneVerified?: boolean;
		onBack: () => void;
		onNext: () => void;
		onUpdate: (data: {
			agreedToPolicy: boolean;
			telegramToken?: string;
			whatsappConnected?: boolean;
			ownerPhone?: string;
			phoneVerified?: boolean;
		}) => void;
	}

	let {
		initialAgreed = false,
		initialTelegramToken = '',
		initialWhatsappConnected = false,
		initialPhone = '',
		initialPhoneVerified = false,
		onBack,
		onNext,
		onUpdate
	}: Props = $props();

	// Bot connection & policy state
	let agreedToPolicy = $state(false);
	let telegramToken = $state('');
	let telegramUsername = $state('');
	let whatsappConnected = $state(false);

	// Internal sub-steps: 'bots' -> 'phone' -> 'otp'
	let subStep = $state<'bots' | 'phone' | 'otp'>('bots');
	let phoneNumber = $state('');
	let phoneVerified = $state(false);
	let isSendingOtp = $state(false);
	let phoneError = $state('');

	// Country code selection state
	let selectedCountry = $state<Country>(COUNTRIES[0]);

	// Segmented 6-digit OTP state
	let otpDigits = $state<string[]>(['', '', '', '', '', '']);
	let otpComponent: ReturnType<typeof Step2OtpVerify> | undefined = $state();
	let resendCountdown = $state(0);
	let countdownTimer: any = null;
	let otpError = $state('');
	let isVerifying = $state(false);

	// Modal popup states
	let isTelegramModalOpen = $state(false);
	let isWhatsappModalOpen = $state(false);
	let isTermsModalOpen = $state(false);

	onMount(async () => {
		agreedToPolicy = initialAgreed;
		telegramToken = initialTelegramToken;
		whatsappConnected = initialWhatsappConnected;
		phoneVerified = initialPhoneVerified;

		if (initialPhone) {
			const matched = COUNTRIES.find((c: Country) => initialPhone.startsWith(c.dialCode));
			if (matched) {
				selectedCountry = matched;
				phoneNumber = initialPhone.slice(matched.dialCode.length);
			} else {
				phoneNumber = initialPhone;
			}
		}

		// Auto-check live WhatsApp status from bot gateway
		try {
			const res = await fetchWhatsappStatus('default');
			if (res.success && res.status === 'open') {
				whatsappConnected = true;
				notifyUpdate();
			}
		} catch (err) {
			console.error('Failed to check live WhatsApp status:', err);
		}
	});

	onDestroy(() => {
		if (countdownTimer) clearInterval(countdownTimer);
	});

	// Sanitize phone number: strip dialCode and leading 0
	let cleanPhone = $derived.by(() => {
		let raw = phoneNumber.trim().replace(/[^0-9]/g, '');
		const dialDigits = selectedCountry.dialCode.replace(/[^0-9]/g, '');
		if (raw.startsWith(dialDigits)) {
			raw = raw.slice(dialDigits.length);
		}
		if (raw.startsWith('0')) {
			raw = raw.slice(1);
		}
		return raw;
	});

	let fullPhoneNumber = $derived(
		cleanPhone ? `${selectedCountry.dialCode}${cleanPhone}` : ''
	);

	let isBotConnected = $derived(whatsappConnected || Boolean(telegramToken));
	let isBotsStepValid = $derived(isBotConnected && agreedToPolicy);
	let isPhoneValid = $derived(cleanPhone.length >= 7 && cleanPhone.length <= 15);
	let isOtpComplete = $derived(
		otpDigits.every((d) => d.trim().length === 1 && !isNaN(Number(d)))
	);

	function notifyUpdate() {
		onUpdate({
			agreedToPolicy,
			telegramToken: telegramToken || undefined,
			whatsappConnected,
			ownerPhone: fullPhoneNumber || undefined,
			phoneVerified
		});
	}

	function handleTelegramSave(token: string, username?: string) {
		telegramToken = token;
		telegramUsername = username || '';
		notifyUpdate();
	}

	function handleWhatsappConfirm(data?: { phoneNumber?: string | null }) {
		whatsappConnected = true;
		if (data?.phoneNumber && !phoneNumber) {
			const phoneStr = data.phoneNumber.replace(/[^0-9]/g, '');
			const matched = COUNTRIES.find((c: Country) => ('+' + phoneStr).startsWith(c.dialCode));
			if (matched) {
				selectedCountry = matched;
				phoneNumber = phoneStr.slice(matched.dialCode.length - 1);
			} else {
				phoneNumber = phoneStr;
			}
		}
		notifyUpdate();
	}

	function togglePolicy() {
		agreedToPolicy = !agreedToPolicy;
		notifyUpdate();
	}

	function handleTermsClick() {
		isTermsModalOpen = true;
	}

	function startCountdown(seconds: number = 60) {
		if (countdownTimer) clearInterval(countdownTimer);
		resendCountdown = seconds;
		countdownTimer = setInterval(() => {
			resendCountdown -= 1;
			if (resendCountdown <= 0) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
		}, 1000);
	}

	function handleProceedToPhone() {
		if (!isBotsStepValid) return;
		subStep = 'phone';
	}

	async function handleSendOtp() {
		if (!isPhoneValid || isSendingOtp) return;
		isSendingOtp = true;
		phoneError = '';
		try {
			const res = await sendOtpCode(fullPhoneNumber, 'whatsapp');
			if (!res.success) {
				phoneError = res.error || 'Failed to send verification code. Please check your phone number.';
				return;
			}
			otpError = '';
			otpDigits = ['', '', '', '', '', ''];
			startCountdown();
			subStep = 'otp';
			notifyUpdate();

			setTimeout(() => {
				otpComponent?.focusFirst();
			}, 100);
		} catch (err: any) {
			phoneError = err.message || 'Failed to send verification code.';
		} finally {
			isSendingOtp = false;
		}
	}

	function handleOtpInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const val = target.value.replace(/[^0-9]/g, '');

		if (val.length > 1) {
			const digits = val.slice(0, 6).split('');
			digits.forEach((d, i) => {
				if (i < 6) otpDigits[i] = d;
			});
			const nextFocus = Math.min(digits.length, 5);
			otpComponent?.focusIndex(nextFocus);
			if (otpDigits.every((d) => d.trim().length === 1)) {
				handleVerifyOtp();
			}
			return;
		}

		otpDigits[index] = val ? val.slice(-1) : '';

		if (val && index < 5) {
			otpComponent?.focusIndex(index + 1);
		}

		if (otpDigits.every((d) => d.trim().length === 1)) {
			handleVerifyOtp();
		}
	}

	function handleOtpKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			otpComponent?.focusIndex(index - 1);
		} else if (e.key === 'Enter' && isOtpComplete) {
			handleVerifyOtp();
		}
	}

	async function handleVerifyOtp() {
		if (!isOtpComplete || isVerifying) return;
		isVerifying = true;
		otpError = '';

		try {
			const enteredCode = otpDigits.join('');
			const res = await verifyOtpCode(fullPhoneNumber, enteredCode);
			if (!res.success) {
				otpError = res.error || 'Invalid or expired OTP code. Please check and try again.';
				return;
			}
			phoneVerified = true;
			notifyUpdate();
			onNext();
		} catch (err: any) {
			otpError = err.message || 'Failed to verify OTP code.';
		} finally {
			isVerifying = false;
		}
	}

	function handleBackNavigation() {
		if (subStep === 'otp') {
			subStep = 'phone';
		} else if (subStep === 'phone') {
			subStep = 'bots';
		} else if (subStep === 'bots') {
			onBack();
		}
	}
</script>

<!-- Sub-Component Modals -->
<Step2TelegramModal
	isOpen={isTelegramModalOpen}
	initialToken={telegramToken}
	initialUsername={telegramUsername}
	onClose={() => (isTelegramModalOpen = false)}
	onSave={handleTelegramSave}
/>

<Step2WhatsappModal
	isOpen={isWhatsappModalOpen}
	isConnected={whatsappConnected}
	onClose={() => (isWhatsappModalOpen = false)}
	onConfirm={handleWhatsappConfirm}
/>

<Step2TermsModal
	isOpen={isTermsModalOpen}
	onClose={() => (isTermsModalOpen = false)}
	onAgree={() => {
		agreedToPolicy = true;
		notifyUpdate();
		isTermsModalOpen = false;
	}}
/>

<div class="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-2 sm:py-6 select-none font-intel">
	<!-- Hero Illustration -->
	<div class="flex items-center justify-center w-full mb-6 sm:mb-8">
		<img
			src="/svg/overview/integration-overview2.svg"
			alt="Connect Bots"
			class="w-64 sm:w-80 md:w-[360px] h-auto object-contain pointer-events-none select-none"
		/>
	</div>

	<!-- Dynamic Header Title -->
	<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-3 tracking-normal">
		{#if subStep === 'bots'}
			Let's Connect Your Bots..
		{:else if subStep === 'phone'}
			Verify Owner Contact..
		{:else if subStep === 'otp'}
			Enter Verification Code..
		{/if}
	</h1>

	<!-- Dynamic Subtitle -->
	<p class="text-xs sm:text-sm text-neutral-500 text-center max-w-md px-4 mb-8 leading-relaxed">
		{#if subStep === 'bots'}
			Connect at least one bot account for your store (WhatsApp or Telegram).
		{:else if subStep === 'phone'}
			Enter your personal phone number. The bot you just connected will send a verification code (OTP) directly to this number.
		{:else if subStep === 'otp'}
			A 6-digit verification code has been sent via your bot to <span class="font-medium text-[#111111]">{selectedCountry.dialCode} {cleanPhone}</span>.
		{/if}
	</p>

	<!-- SUB-STEPS -->
	{#if subStep === 'bots'}
		<Step2BotsSelection
			{whatsappConnected}
			{telegramToken}
			{telegramUsername}
			{agreedToPolicy}
			onOpenWhatsapp={() => (isWhatsappModalOpen = true)}
			onOpenTelegram={() => (isTelegramModalOpen = true)}
			onOpenTerms={handleTermsClick}
			onTogglePolicy={togglePolicy}
		/>
	{:else if subStep === 'phone'}
		<Step2PhoneInput
			{phoneNumber}
			{selectedCountry}
			{whatsappConnected}
			{telegramToken}
			{phoneError}
			{isPhoneValid}
			{isSendingOtp}
			onCountryChange={(c) => (selectedCountry = c)}
			onPhoneChange={(p) => (phoneNumber = p)}
			onSendOtp={handleSendOtp}
			onSwitchToBots={() => (subStep = 'bots')}
		/>
	{:else if subStep === 'otp'}
		<Step2OtpVerify
			bind:this={otpComponent}
			{otpDigits}
			{otpError}
			{isVerifying}
			{isOtpComplete}
			{resendCountdown}
			dialCode={selectedCountry.dialCode}
			{cleanPhone}
			onOtpInput={handleOtpInput}
			onOtpKeydown={handleOtpKeydown}
			onVerify={handleVerifyOtp}
			onResend={handleSendOtp}
			onChangePhone={() => (subStep = 'phone')}
		/>
	{/if}

	<!-- Global Step Navigation (Back & Next) -->
	<div class="flex items-center justify-center gap-10 text-sm sm:text-base font-intel pt-2">
		<button
			type="button"
			onclick={handleBackNavigation}
			class="text-[#111111] hover:text-[#1ED10E] transition-colors cursor-pointer select-none"
		>
			&larr; Back
		</button>

		{#if subStep === 'bots'}
			<button
				type="button"
				onclick={handleProceedToPhone}
				disabled={!isBotsStepValid}
				class={`transition-colors select-none ${
					isBotsStepValid
						? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer'
						: 'text-neutral-300 cursor-not-allowed pointer-events-none'
				}`}
				title={!isBotConnected ? 'Connect at least one bot (WhatsApp or Telegram)' : !agreedToPolicy ? 'Please agree to the policy first' : 'Next'}
			>
				Next &rarr;
			</button>
		{:else if subStep === 'phone'}
			<button
				type="button"
				onclick={handleSendOtp}
				disabled={!isPhoneValid}
				class={`transition-colors select-none ${
					isPhoneValid
						? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer'
						: 'text-neutral-300 cursor-not-allowed pointer-events-none'
				}`}
			>
				Next &rarr;
			</button>
		{:else if subStep === 'otp'}
			<button
				type="button"
				onclick={handleVerifyOtp}
				disabled={!isOtpComplete || isVerifying}
				class={`transition-colors select-none ${
					isOtpComplete && !isVerifying
						? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer'
						: 'text-neutral-300 cursor-not-allowed pointer-events-none'
				}`}
			>
				Next &rarr;
			</button>
		{/if}
	</div>
</div>
