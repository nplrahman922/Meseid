<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import KanalHeader from './components/KanalHeader.svelte';
	import WhatsAppCard from './components/WhatsAppCard.svelte';
	import TelegramCard from './components/TelegramCard.svelte';
	import GoogleIntegrationCard from './components/GoogleIntegrationCard.svelte';
	import AllowedContactsCard from './components/AllowedContactsCard.svelte';
	import BannedWordsCard from './components/BannedWordsCard.svelte';
	import ConnectionLogsCard from './components/ConnectionLogsCard.svelte';
	import { fetchKanalStatus } from './kanal-bot.service';
	import type { WhatsAppChannelState, TelegramChannelState } from './kanal.types';

	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Bisnis Saya',
		userName = 'Owner',
		role = 'Owner',
		dateText = ''
	}: Props = $props();

	let waState = $state<WhatsAppChannelState>({
		status: 'disconnected',
		businessName,
		phoneNumber: null,
		phoneNumberMasked: '',
		qrCaption: 'Buka WhatsApp di HP Anda untuk memindai kode QR.',
		qrDataUrl: undefined,
		conflictReason: null,
		ownerPhone: null,
		ownerPhoneVerified: false
	});

	let tgState = $state<TelegramChannelState>({
		status: 'disconnected',
		botId: null,
		botUsername: '',
		tokenMasked: '',
		webhookStatus: 'untested',
		webhookDetail: 'Belum diuji'
	});

	let pollTimer: ReturnType<typeof setInterval> | null = null;

	async function loadStatus() {
		try {
			const res = await fetchKanalStatus();
			if (res.success && res.data) {
				const d = res.data;
				waState.status = d.whatsapp.status;
				waState.phoneNumber = d.whatsapp.phoneNumber;
				waState.qrDataUrl = d.whatsapp.qr || undefined;
				waState.conflictReason = d.whatsapp.conflictReason;
				waState.businessName = d.businessName || businessName;
				waState.ownerPhone = d.ownerPhone;
				waState.ownerPhoneVerified = d.ownerPhoneVerified;

				tgState.status = d.telegram.status;
				tgState.botId = d.telegram.botId;
				tgState.botUsername = d.telegram.botUsername || (d.telegram.status === 'connected' ? 'Bot Telegram Terdaftar' : '');
				tgState.tokenMasked = d.telegram.tokenMasked || '';
			}
		} catch (err) {
			console.error('Failed to load kanal status:', err);
		}
	}

	function startPollingIfNeeded() {
		stopPolling();
		pollTimer = setInterval(async () => {
			if (waState.status === 'connecting' || waState.status === 'qr_ready') {
				await loadStatus();
			}
		}, 2500);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	$effect(() => {
		if (waState.status === 'connecting' || waState.status === 'qr_ready') {
			startPollingIfNeeded();
		} else {
			stopPolling();
		}
	});

	onMount(async () => {
		await loadStatus();
	});

	onDestroy(() => {
		stopPolling();
	});

	let connectionSummary = $derived.by(() => {
		const parts: string[] = [];
		if (waState.status === 'connected') parts.push('WhatsApp tersambung');
		else parts.push('WhatsApp terputus');

		if (tgState.status === 'connected') parts.push('Telegram tersambung');
		else parts.push('Telegram belum terhubung');

		return `${parts.join(' · ')}. Diperiksa secara real-time.`;
	});
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- Top Header with Status Banner -->
	<KanalHeader
		businessName={waState.businessName || businessName}
		{role}
		{dateText}
		{connectionSummary}
	/>

	<!-- Two-column Grid for Messaging Channels -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<WhatsAppCard
			bind:channelState={waState}
			onStatusRefresh={loadStatus}
		/>
		<TelegramCard
			bind:channelState={tgState}
			onStatusRefresh={loadStatus}
		/>
	</div>

	<!-- Full-width Google Integration Card -->
	<GoogleIntegrationCard />

	<!-- Full-width Whitelist & Access Rights Card -->
	<AllowedContactsCard />

	<!-- Full-width Moderation & Banned Words Card -->
	<BannedWordsCard />

	<!-- Full-width Connection Audit Logs Card -->
	<ConnectionLogsCard />
</div>
