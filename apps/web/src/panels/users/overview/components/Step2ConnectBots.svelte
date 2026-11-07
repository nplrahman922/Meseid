<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Step2TelegramModal from './Step2TelegramModal.svelte';
	import Step2WhatsappModal from './Step2WhatsappModal.svelte';
	import Step2TermsModal from './Step2TermsModal.svelte';
	import Step2BotsSelection from './Step2BotsSelection.svelte';
	import Step2PhoneInput, { COUNTRIES, type Country } from './Step2PhoneInput.svelte';
	import Step2OtpVerify from './Step2OtpVerify.svelte';
	import Step2TelegramOtp from './Step2TelegramOtp.svelte';
	import {
		sendOtpCode,
		verifyOtpCode,
		verifyTelegramOtpCode,
		fetchWhatsappStatus
	} from '../overviewService';

	interface Props {
		initialAgreed?: boolean;
		initialTelegramToken?: string;
		initialWhatsappConnected?: boolean;
		initialPhone?: string;
		initialPhoneVerified?: boolean;
		initialTelegramVerified?: boolean;
		initialTelegramOwnerChatId?: string;
		onBack: () => void;
		onNext: () => void;
		onUpdate: (data: {
			agreedToPolicy: boolean;
			telegramToken?: string;
			whatsappConnected?: boolean;
			ownerPhone?: string;
			phoneVerified?: boolean;
			telegramVerified?: boolean;
			telegramOwnerChatId?: string;
		}) => void;
	}

	let {
		initialAgreed = false,
		initialTelegramToken = '',
		initialWhatsappConnected = false,
		initialPhone = '',
		initialPhoneVerified = false,
		initialTelegramVerified = false,
		initialTelegramOwnerChatId = '',
		onBack,
		onNext,
		onUpdate
	}: Props = $props();

	// Bot connection & verification states
	let agreedToPolicy = $state(false);
	let telegramToken = $state('');
	let telegramUsername = $state('');
	let telegramVerified = $state(false);
	let telegramOwnerChatId = $state('');
	let whatsappConnected = $state(false);

	// Navigation sub-steps: 'bots' | 'phone' | 'whatsapp-otp' | 'telegram-otp'
	let subStep = $state<'bots' | 'phone' | 'whatsapp-otp' | 'telegram-otp'>('bots');
	let phoneNumber = $state('');
	let phoneVerified = $state(false);
	let isSendingOtp = $state(false);
	let phoneError = $state('');

	// Country code and segmented 6-digit WhatsApp OTP
	let selectedCountry = $state<Country>(COUNTRIES[0]);
	let otpDigits = $state<string[]>(['', '', '', '', '', '']);
	let otpComponent: ReturnType<typeof Step2OtpVerify> | undefined = $state();
	let resendCountdown = $state(0);
	let countdownTimer: any = null;
	let otpError = $state('');
	let isVerifying = $state(false);

	// Modal popups
	let isTelegramModalOpen = $state(false);
	let isWhatsappModalOpen = $state(false);
	let isTermsModalOpen = $state(false);

	onMount(async () => {
		agreedToPolicy = initialAgreed;
		telegramToken = initialTelegramToken;
		whatsappConnected = initialWhatsappConnected;
		phoneVerified = initialPhoneVerified;
		telegramVerified = initialTelegramVerified;
		telegramOwnerChatId = initialTelegramOwnerChatId;

		if (initialPhone) {
			const matched = COUNTRIES.find((c: Country) => initialPhone.startsWith(c.dialCode));
			phoneNumber = matched ? initialPhone.slice(matched.dialCode.length) : initialPhone;
			if (matched) selectedCountry = matched;
		}

		try {
			const res = await fetchWhatsappStatus();
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

	let cleanPhone = $derived.by(() => {
		let raw = phoneNumber.trim().replace(/[^0-9]/g, '');
		const dialDigits = selectedCountry.dialCode.replace(/[^0-9]/g, '');
		if (raw.startsWith(dialDigits)) raw = raw.slice(dialDigits.length);
		if (raw.startsWith('0')) raw = raw.slice(1);
		return raw;
	});

	let fullPhoneNumber = $derived(cleanPhone ? `${selectedCountry.dialCode}${cleanPhone}` : '');
	let isBotConnected = $derived(whatsappConnected || Boolean(telegramToken));
	let isBotsStepValid = $derived(isBotConnected && agreedToPolicy);
	let isPhoneValid = $derived(cleanPhone.length >= 7 && cleanPhone.length <= 15);
	let isOtpComplete = $derived(otpDigits.every((d) => d.trim().length === 1 && !isNaN(Number(d))));

	let headerTitle = $derived(
		subStep === 'bots' ? "Let's Connect Your Bots.." :
		subStep === 'phone' ? 'Verify Owner WhatsApp Contact..' :
		subStep === 'whatsapp-otp' ? 'Enter WhatsApp Verification Code..' :
		'Verify Telegram Owner Identity..'
	);

	let headerSubtitle = $derived(
		subStep === 'bots' ? 'Connect at least one bot account for your store (WhatsApp or Telegram).' :
		subStep === 'phone' ? 'Enter your personal phone number. The connected WhatsApp bot will send a verification code (OTP) directly to this number.' :
		subStep === 'whatsapp-otp' ? `A 6-digit verification code has been sent via WhatsApp to ${selectedCountry.dialCode} ${cleanPhone}.` :
		'Follow the instructions below to verify your personal Telegram account with your store bot.'
	);

	function notifyUpdate() {
		onUpdate({
			agreedToPolicy,
			telegramToken: telegramToken || undefined,
			whatsappConnected,
			ownerPhone: fullPhoneNumber || undefined,
			phoneVerified,
			telegramVerified,
			telegramOwnerChatId: telegramOwnerChatId || undefined
		});
	}

	function handleProceedFromBots() {
		if (!isBotsStepValid) return;
		if (whatsappConnected && !phoneVerified) {
			subStep = 'phone';
			return;
		}
		if (telegramToken && !telegramVerified) {
			subStep = 'telegram-otp';
			return;
		}
		onNext();
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
			phoneNumber = matched ? phoneStr.slice(matched.dialCode.length - 1) : phoneStr;
			if (matched) selectedCountry = matched;
		}
		notifyUpdate();
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
			subStep = 'whatsapp-otp';
			notifyUpdate();
			setTimeout(() => otpComponent?.focusFirst(), 100);
		} catch (err: any) {
			phoneError = err.message || 'Failed to send verification code.';
		} finally {
			isSendingOtp = false;
		}
	}

	async function handleVerifyWhatsappOtp() {
		if (!isOtpComplete || isVerifying) return;
		isVerifying = true;
		otpError = '';
		try {
			const code = otpDigits.join('');
			const res = await verifyOtpCode(fullPhoneNumber, code);
			if (!res.success) {
				otpError = res.error || 'Invalid or expired OTP code.';
				return;
			}
			phoneVerified = true;
			notifyUpdate();
			if (telegramToken && !telegramVerified) {
				subStep = 'telegram-otp';
			} else {
				onNext();
			}
		} catch (err: any) {
			otpError = err.message || 'Failed to verify OTP code.';
		} finally {
			isVerifying = false;
		}
	}

	async function handleVerifyTelegramOtp(code: string) {
		const res = await verifyTelegramOtpCode(code);
		if (res.success) {
			telegramVerified = true;
			if (res.chatId) telegramOwnerChatId = res.chatId;
			notifyUpdate();
			return { success: true };
		}
		return { success: false, error: res.error };
	}

	function handleBackNavigation() {
		if (subStep === 'whatsapp-otp') subStep = 'phone';
		else if (subStep === 'phone' || subStep === 'telegram-otp') subStep = 'bots';
		else if (subStep === 'bots') onBack();
	}
</script>

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
	<div class="flex items-center justify-center w-full mb-6 sm:mb-8">
		<img
			src="/svg/overview/integration-overview2.svg"
			alt="Connect Bots"
			class="w-64 sm:w-80 md:w-[360px] h-auto object-contain pointer-events-none select-none"
		/>
	</div>

	<h1 class="text-2xl sm:text-3xl md:text-[32px] font-intel text-[#111111] font-normal text-center mb-3 tracking-normal">
		{headerTitle}
	</h1>

	<p class="text-xs sm:text-sm text-neutral-500 text-center max-w-md px-4 mb-8 leading-relaxed">
		{headerSubtitle}
	</p>

	{#if subStep === 'bots'}
		<Step2BotsSelection
			{whatsappConnected}
			{telegramToken}
			{telegramUsername}
			{agreedToPolicy}
			{phoneVerified}
			fullPhoneNumber={initialPhone || fullPhoneNumber}
			{telegramVerified}
			onChangePhone={() => (subStep = 'phone')}
			onVerifyTelegramOwner={() => (subStep = 'telegram-otp')}
			onOpenWhatsapp={() => (isWhatsappModalOpen = true)}
			onOpenTelegram={() => (isTelegramModalOpen = true)}
			onOpenTerms={() => (isTermsModalOpen = true)}
			onTogglePolicy={() => {
				agreedToPolicy = !agreedToPolicy;
				notifyUpdate();
			}}
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
	{:else if subStep === 'whatsapp-otp'}
		<Step2OtpVerify
			bind:this={otpComponent}
			{otpDigits}
			{otpError}
			{isVerifying}
			{isOtpComplete}
			{resendCountdown}
			dialCode={selectedCountry.dialCode}
			{cleanPhone}
			onOtpInput={(i, e) => {
				const val = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
				otpDigits[i] = val ? val.slice(-1) : '';
				if (val && i < 5) otpComponent?.focusIndex(i + 1);
				if (otpDigits.every((d) => d.trim().length === 1)) handleVerifyWhatsappOtp();
			}}
			onOtpKeydown={(i, e) => {
				if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpComponent?.focusIndex(i - 1);
				else if (e.key === 'Enter' && isOtpComplete) handleVerifyWhatsappOtp();
			}}
			onVerify={handleVerifyWhatsappOtp}
			onResend={handleSendOtp}
			onChangePhone={() => (subStep = 'phone')}
		/>
	{:else if subStep === 'telegram-otp'}
		<Step2TelegramOtp
			{telegramUsername}
			onVerifyCode={handleVerifyTelegramOtp}
			onBack={() => (subStep = 'bots')}
			onSuccess={() => onNext()}
		/>
	{/if}

	{#if subStep !== 'telegram-otp'}
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
					onclick={handleProceedFromBots}
					disabled={!isBotsStepValid}
					class={`transition-colors select-none ${
						isBotsStepValid
							? 'text-[#111111] hover:text-[#1ED10E] cursor-pointer'
							: 'text-neutral-300 cursor-not-allowed pointer-events-none'
					}`}
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
			{:else if subStep === 'whatsapp-otp'}
				<button
					type="button"
					onclick={handleVerifyWhatsappOtp}
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
	{/if}
</div>
