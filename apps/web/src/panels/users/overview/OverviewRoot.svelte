<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import OverviewNavbar from './components/OverviewNavbar.svelte';
	import Step1Name from './components/Step1Name.svelte';
	import Step1Business from './components/Step1Business.svelte';
	import Step2ConnectBots from './components/Step2ConnectBots.svelte';
	import Step3Choice from './components/Step3Choice.svelte';
	import Step3PersonalizeForm from './components/Step3PersonalizeForm.svelte';
	import Step4KnowledgeBase from './components/Step4KnowledgeBase.svelte';
	import Step5Ready from './components/Step5Ready.svelte';
	import {
		defaultOverviewData,
		getOverviewDraft,
		isOverviewCompleted,
		markOverviewSeen,
		resetOverviewStatus,
		saveOverviewDraft,
		submitOnboarding,
		fetchOnboardingStatus,
		fetchOnboardingDetail,
		type OverviewData
	} from './overviewService';

	// State internal langkah (1: Identitas, 2: Koneksi Bot, 3: Personalisasi, 4: KB, 5: Final)
	let currentStep = $state(1);
	let subStep1 = $state<'name' | 'business'>('name');
	let subStep3 = $state<'choice' | 'store' | 'assistant'>('choice');
	let draftData = $state<OverviewData>(defaultOverviewData);
	let isReady = $state(false);

	// Arah transisi halaman: 1 untuk Next (geser dari kanan ke kiri), -1 untuk Back (geser dari kiri ke kanan)
	let direction = $state<1 | -1>(1);

	// Composite key untuk memicu transisi halus pada setiap pergantian langkah utama maupun sub-langkah
	let currentStepKey = $derived(
		currentStep === 1 ? `step-1-${subStep1}` :
		currentStep === 3 ? `step-3-${subStep3}` : `step-${currentStep}`
	);

	onMount(async () => {
		const isForceNewUser =
			import.meta.env.DEV &&
			typeof window !== 'undefined' &&
			window.location.search.includes('new_user=true');

		if (isForceNewUser) {
			resetOverviewStatus();
			draftData = { ...defaultOverviewData };
			isReady = true;
			return;
		}

		// Ambil data konfigurasi onboarding dari database untuk Pre-fill form
		try {
			const detail = await fetchOnboardingDetail();
			if (detail && (detail.businessName || detail.userName || (detail.knowledgeBase && detail.knowledgeBase.length > 0))) {
				draftData = detail;
				saveOverviewDraft(detail);
			} else {
				draftData = getOverviewDraft();
			}
		} catch (e) {
			draftData = getOverviewDraft();
		}

		isReady = true;
	});

	function handleNext() {
		direction = 1;
		if (currentStep === 3) {
			if (subStep3 === 'choice') {
				subStep3 = 'store';
				return;
			}
			if (subStep3 === 'store') {
				subStep3 = 'assistant';
				return;
			}
			if (subStep3 === 'assistant') {
				currentStep = 4;
				return;
			}
		}

		if (currentStep < 5) {
			currentStep += 1;
		} else if (currentStep === 5) {
			handleFinish();
		}
	}

	function handleBack() {
		direction = -1;
		if (currentStep === 3) {
			if (subStep3 === 'assistant') {
				subStep3 = 'store';
				return;
			}
			if (subStep3 === 'store') {
				subStep3 = 'choice';
				return;
			}
			if (subStep3 === 'choice') {
				currentStep = 2;
				return;
			}
		}

		if (currentStep === 2) {
			currentStep = 1;
			subStep1 = 'business';
			return;
		}

		if (currentStep === 1 && subStep1 === 'business') {
			subStep1 = 'name';
			return;
		}

		if (currentStep > 1) {
			currentStep -= 1;
		}
	}

	function handleDevReset() {
		resetOverviewStatus();
		draftData = { ...defaultOverviewData };
		direction = -1;
		currentStep = 1;
		subStep1 = 'name';
		subStep3 = 'choice';
	}

	async function handleFinish() {
		try {
			await submitOnboarding(draftData);
		} catch (e) {
			console.error('Error submitting onboarding setup:', e);
		}
		markOverviewSeen();
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Meseid — Overview</title>
</svelte:head>

{#if isReady}
	<div class="min-h-screen w-full flex flex-col justify-between bg-white text-[#111111] font-intel overflow-x-hidden">
		<!-- Top Navigation Header -->
		<OverviewNavbar {currentStep} onReset={handleDevReset} />

		<!-- Main Step Container -->
		<main class="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-4xl mx-auto py-4 sm:py-8 overflow-hidden">
			{#key currentStepKey}
				<div
					in:fly={{ x: direction * 40, duration: 280, easing: cubicOut }}
					class="w-full flex flex-col items-center justify-center"
				>
					{#if currentStep === 1}
						{#if subStep1 === 'name'}
							<Step1Name
								initialName={draftData.userName}
								onNext={(name) => {
									draftData.userName = name;
									saveOverviewDraft({ userName: name });
									direction = 1;
									subStep1 = 'business';
								}}
							/>
						{:else if subStep1 === 'business'}
							<Step1Business
								initialBusinessName={draftData.businessName}
								initialBusinessType={draftData.businessType}
								initialCustomCategory={draftData.customCategory}
								initialBusinessDescription={draftData.businessDescription}
								onBack={() => {
									direction = -1;
									subStep1 = 'name';
								}}
								onNext={(data) => {
									draftData.businessName = data.businessName;
									draftData.businessType = data.businessType;
									draftData.customCategory = data.customCategory;
									draftData.businessDescription = data.businessDescription;
									saveOverviewDraft({
										businessName: data.businessName,
										businessType: data.businessType,
										customCategory: data.customCategory,
										businessDescription: data.businessDescription
									});
									direction = 1;
									currentStep = 2;
								}}
							/>
						{/if}
					{:else if currentStep === 2}
						<Step2ConnectBots
							initialAgreed={draftData.agreedToPolicy}
							initialTelegramToken={draftData.telegramToken}
							initialWhatsappConnected={draftData.whatsappConnected}
							initialPhone={draftData.ownerPhone}
							initialPhoneVerified={draftData.phoneVerified}
							onBack={handleBack}
							onNext={handleNext}
							onUpdate={(data) => {
								draftData.agreedToPolicy = data.agreedToPolicy;
								draftData.telegramToken = data.telegramToken;
								draftData.whatsappConnected = data.whatsappConnected;
								if (data.ownerPhone !== undefined) draftData.ownerPhone = data.ownerPhone;
								if (data.phoneVerified !== undefined) draftData.phoneVerified = data.phoneVerified;
								saveOverviewDraft({
									agreedToPolicy: data.agreedToPolicy,
									telegramToken: data.telegramToken,
									whatsappConnected: data.whatsappConnected,
									ownerPhone: data.ownerPhone,
									phoneVerified: data.phoneVerified
								});
							}}
						/>
					{:else if currentStep === 3}
						{#if subStep3 === 'choice'}
							<Step3Choice
								onBack={() => {
									direction = -1;
									currentStep = 2;
								}}
								onNext={(choice) => {
									direction = 1;
									if (choice === 'default') {
										currentStep = 4;
									} else {
										subStep3 = 'store';
									}
								}}
							/>
						{:else if subStep3 === 'store'}
							<Step3PersonalizeForm
								type="store"
								initialBotName={draftData.storeBotName}
								initialSpeakingStyles={draftData.storeSpeakingStyles}
								initialCustomRules={draftData.storeCustomRules}
								showSubmitButton={true}
								onBack={() => {
									direction = -1;
									subStep3 = 'choice';
								}}
								onNext={() => {
									direction = 1;
									subStep3 = 'assistant';
								}}
								onSubmitDraft={(data) => {
									draftData.storeBotName = data.botName;
									draftData.storeSpeakingStyles = data.speakingStyles;
									draftData.storeCustomRules = data.customRules;
									saveOverviewDraft({
										storeBotName: data.botName,
										storeSpeakingStyles: data.speakingStyles,
										storeCustomRules: data.customRules
									});
								}}
							/>
						{:else if subStep3 === 'assistant'}
							<Step3PersonalizeForm
								type="assistant"
								initialBotName={draftData.assistantBotName}
								initialSpeakingStyles={draftData.assistantSpeakingStyles}
								initialCustomRules={draftData.assistantCustomRules}
								showSubmitButton={true}
								onBack={() => {
									direction = -1;
									subStep3 = 'store';
								}}
								onNext={() => {
									direction = 1;
									currentStep = 4;
								}}
								onSubmitDraft={(data) => {
									draftData.assistantBotName = data.botName;
									draftData.assistantSpeakingStyles = data.speakingStyles;
									draftData.assistantCustomRules = data.customRules;
									saveOverviewDraft({
										assistantBotName: data.botName,
										assistantSpeakingStyles: data.speakingStyles,
										assistantCustomRules: data.customRules
									});
								}}
							/>
						{/if}
					{:else if currentStep === 4}
						<Step4KnowledgeBase
							initialItems={draftData.knowledgeBase}
							onBack={() => {
								direction = -1;
								currentStep = 3;
							}}
							onNext={() => {
								direction = 1;
								currentStep = 5;
							}}
							onSubmitDraft={(items) => {
								draftData.knowledgeBase = items;
								saveOverviewDraft({ knowledgeBase: items });
							}}
						/>
					{:else if currentStep === 5}
						<Step5Ready
							userName={draftData.userName}
							onFinish={handleFinish}
						/>
					{/if}
				</div>
			{/key}
		</main>

		<!-- Bottom Spacer -->
		<div class="w-full py-4"></div>
	</div>
{/if}

