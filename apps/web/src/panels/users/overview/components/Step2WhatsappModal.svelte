<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import { fetchWhatsappStatus, resetWhatsappSession } from '../overviewService';

	interface Props {
		isOpen: boolean;
		isConnected?: boolean;
		onClose: () => void;
		onConfirm: (data?: { phoneNumber?: string | null }) => void;
	}

	let {
		isOpen,
		isConnected = false,
		onClose,
		onConfirm
	}: Props = $props();

	let riskAccepted = $state(false);
	let showRiskDetails = $state(false);

	// Real-time Baileys connection state
	let connectionStatus = $state<'connecting' | 'qr_ready' | 'open' | 'close' | 'logged_out' | 'conflict'>('connecting');
	let connectedPhone = $state<string | null>(null);
	let qrDataUrl = $state<string>('');
	let lastRawQr = $state<string>('');
	let isResetting = $state(false);
	let errorMessage = $state('');
	let pollTimer: any = null;

	async function updateQrImage(rawQr: string) {
		try {
			qrDataUrl = await QRCode.toDataURL(rawQr, {
				width: 260,
				margin: 1,
				color: {
					dark: '#000000',
					light: '#ffffff'
				}
			});
		} catch (err: any) {
			console.error('Failed to generate QR data URL:', err);
		}
	}

	async function checkLiveStatus() {
		try {
			const res = await fetchWhatsappStatus();
			if (res.success) {
				connectionStatus = res.status;
				connectedPhone = res.phoneNumber;

				if (res.status === 'open') {
					errorMessage = '';
				} else if (res.status === 'conflict') {
					errorMessage =
						res.conflictReason ||
						'Nomor WhatsApp ini sudah terdaftar pada akun bisnis lain di Meseid.';
				} else if (res.status === 'qr_ready' && res.qr) {
					if (res.qr !== lastRawQr) {
						lastRawQr = res.qr;
						await updateQrImage(res.qr);
					}
					errorMessage = '';
				} else if (res.status === 'close' || res.status === 'logged_out') {
					errorMessage = 'Connection closed. Click reset to generate a fresh QR code.';
				}
			}
		} catch (err: any) {
			console.error('Failed to poll WhatsApp status:', err);
		}
	}

	function startPolling() {
		stopPolling();
		checkLiveStatus();
		pollTimer = setInterval(checkLiveStatus, 2500);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	$effect(() => {
		if (isOpen) {
			startPolling();
		} else {
			stopPolling();
		}
	});

	onDestroy(() => {
		stopPolling();
	});

	async function handleResetSession() {
		if (isResetting) return;
		isResetting = true;
		connectionStatus = 'connecting';
		qrDataUrl = '';
		lastRawQr = '';
		errorMessage = '';

		try {
			const res = await resetWhatsappSession();
			if (!res.success) {
				errorMessage = res.error || 'Failed to reset WhatsApp session.';
			}
			await checkLiveStatus();
		} catch (err: any) {
			errorMessage = err.message || 'Error occurred while resetting session.';
		} finally {
			isResetting = false;
		}
	}

	function handleContinue() {
		if (!riskAccepted) return;
		onConfirm({ phoneNumber: connectedPhone });
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="whatsapp-modal-title"
	>
		<!-- Backdrop click to close -->
		<button
			type="button"
			class="fixed inset-0 w-full h-full cursor-default bg-transparent -z-10"
			onclick={onClose}
			aria-label="Close modal backdrop"
		></button>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-[500px] max-h-[92vh] overflow-y-auto bg-white rounded-[28px] border border-neutral-200 p-6 sm:p-8 shadow-2xl flex flex-col items-center font-intel select-none"
		>
			<!-- Close button -->
			<button
				type="button"
				onclick={onClose}
				class="absolute top-4 right-5 text-neutral-400 hover:text-neutral-700 text-lg cursor-pointer"
				aria-label="Close modal"
			>
				&times;
			</button>

			<!-- Title -->
			<h2 id="whatsapp-modal-title" class="text-xl sm:text-2xl text-[#111111] font-normal text-center mb-1 tracking-tight">
				Connect Store WhatsApp Bot
			</h2>
			<p class="text-xs text-neutral-500 text-center mb-3">
				Link your dedicated store number to handle automated customer inquiries
			</p>

			<!-- Live Connection & QR Code Container -->
			<div
				class="w-full rounded-2xl border-2 border-[#5FD068] bg-white p-4 sm:p-5 flex flex-col items-center my-2 shadow-xs shrink-0 overflow-hidden"
			>
				{#if connectionStatus === 'open'}
					<!-- Connected Status Display -->
					<div class="flex flex-col items-center text-center space-y-2 py-4 animate-in fade-in duration-300">
						<div class="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center shadow-xs">
							<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</div>
						<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
							<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
							<span>Connected successfully</span>
						</div>
						<p class="text-base font-semibold text-neutral-900 tracking-tight">
							+{connectedPhone || 'WhatsApp Store Bot'}
						</p>
						<p class="text-xs text-neutral-500 max-w-[320px]">
							Your store bot is online. It is ready to send invoices, notifications, and answer customer chats.
						</p>

						<div class="pt-2">
							<button
								type="button"
								onclick={handleResetSession}
								disabled={isResetting}
								class="text-xs text-neutral-500 hover:text-red-600 underline transition-colors cursor-pointer disabled:opacity-50"
							>
								{isResetting ? 'Resetting session...' : 'Link a different number (Scan new QR)'}
							</button>
						</div>
					</div>

				{:else if connectionStatus === 'qr_ready' && qrDataUrl}
					<!-- Live QR Code Display -->
					<div class="flex flex-col items-center text-center space-y-2.5">
						<div class="p-2 bg-white rounded-xl shadow-xs border border-neutral-100">
							<img
								src={qrDataUrl}
								alt="Live WhatsApp QR Code"
								class="w-44 h-44 sm:w-48 sm:h-48 object-contain"
							/>
						</div>
						<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
							<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
							<span>Ready for scan</span>
						</div>
						<p class="text-xs text-neutral-500 leading-snug max-w-[280px]">
							Point your WhatsApp camera at this QR code. Refreshes automatically.
						</p>
					</div>

				{:else if connectionStatus === 'connecting' || isResetting}
					<!-- Connecting / Processing State -->
					<div class="flex flex-col items-center text-center space-y-3 py-10 animate-in fade-in duration-200">
						<div class="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
						<div class="inline-flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
							<span>Connecting to WhatsApp...</span>
						</div>
						<p class="text-xs text-neutral-400 max-w-[280px]">
							Establishing secure connection with WhatsApp servers. Please wait a moment.
						</p>
					</div>

				{:else if connectionStatus === 'conflict'}
					<!-- Number Conflict State -->
					<div class="flex flex-col items-center text-center space-y-3 py-6 animate-in fade-in duration-200">
						<div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-2xl font-bold shadow-xs">
							⚠️
						</div>
						<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
							<span>Nomor Sudah Terdaftar</span>
						</div>
						<p class="text-xs text-neutral-800 font-medium max-w-[320px]">
							{errorMessage || 'Nomor WhatsApp ini sudah terdaftar pada akun bisnis lain.'}
						</p>
						<p class="text-[11px] text-neutral-500 max-w-[320px] leading-relaxed">
							Notifikasi keamanan telah dikirimkan ke nomor WhatsApp tersebut. Jika ini benar nomor Anda, silakan putuskan sambungan dari akun lama terlebih dahulu.
						</p>
						<button
							type="button"
							onclick={handleResetSession}
							disabled={isResetting}
							class="px-4 py-2 rounded-xl bg-[#5FD068] hover:bg-[#4eb856] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
						>
							{isResetting ? 'Memulai Ulang...' : '🔄 Coba Scan Ulang (Nomor Lain)'}
						</button>
					</div>

				{:else}
					<!-- Connection Failed / Disconnected State -->
					<div class="flex flex-col items-center text-center space-y-3 py-6 animate-in fade-in duration-200">
						<div class="w-12 h-12 rounded-full bg-red-50 text-red-500 border border-red-200 flex items-center justify-center text-xl font-bold">
							!
						</div>
						<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
							<span>Connection failed</span>
						</div>
						<p class="text-xs text-neutral-500 max-w-[300px]">
							{errorMessage || 'Unable to load QR code. Session may have timed out.'}
						</p>
						<button
							type="button"
							onclick={handleResetSession}
							disabled={isResetting}
							class="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-colors cursor-pointer"
						>
							{isResetting ? 'Restarting...' : 'Restart & Generate QR'}
						</button>
					</div>
				{/if}
			</div>

			<!-- Steps To Connect -->
			<div class="w-full text-left text-xs sm:text-[13px] text-[#111111] leading-relaxed space-y-1.5 my-2">
				<p class="font-normal mb-1">Steps To Connect :</p>
				<p>1. Use a Dedicated Number: We strongly recommend using a secondary WhatsApp number for store bot operations rather than your personal account.</p>
				<p>2. Open WhatsApp on your phone.</p>
				<p>3. Tap Settings (iOS) or the three dots menu (Android) &gt; Linked Devices.</p>
				<p>4. Tap Link a Device and point your camera at this QR code.</p>
				<div class="pt-1.5">
					<button
						type="button"
						onclick={() => (showRiskDetails = !showRiskDetails)}
						class="text-xs text-[#EF4444] hover:text-[#DC2626] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
						aria-expanded={showRiskDetails}
					>
						<span>&rarr; Read API Unofficial Risk!</span>
						<span class="text-[11px] underline">({showRiskDetails ? 'Hide details' : 'Click to view'})</span>
					</button>
				</div>
			</div>

			<!-- Detailed Risk Information Card -->
			{#if showRiskDetails}
				<div
					class="w-full my-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 sm:p-5 text-xs sm:text-[13px] text-[#111111] leading-relaxed space-y-3 font-intel animate-in fade-in duration-200"
				>
					<div class="flex items-center justify-between pb-1.5 border-b border-red-200/60">
						<div class="flex items-center gap-1.5 font-semibold text-[#DC2626]">
							<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
							<span>Unofficial Integration Risks</span>
						</div>
						<button
							type="button"
							onclick={() => (showRiskDetails = false)}
							class="text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer font-medium"
						>
							Close &times;
						</button>
					</div>

					<p class="text-neutral-700">
						Meseid connects to WhatsApp through an unofficial integration. Please note the following guidelines:
					</p>

					<div class="space-y-2 text-neutral-700">
						<p><strong class="text-neutral-900 font-medium">• Dedicated Bot Account:</strong> Use a separate business line to prevent your personal number from disruption.</p>
						<p><strong class="text-neutral-900 font-medium">• Anti-Spam Policy:</strong> Never use the bot for unsolicited broadcast messages or spam. Only answer customers who start conversations.</p>
					</div>

					<div class="p-2.5 rounded-xl bg-white border border-red-200/60 text-neutral-800 text-[12px] flex items-start gap-2 shadow-2xs">
						<span class="font-bold text-neutral-600">[Note]</span>
						<p><strong class="text-neutral-900 font-medium">Alternative:</strong> Telegram bots operate through official Telegram APIs without third-party integration constraints.</p>
					</div>
				</div>
			{/if}

			<!-- Policy Disclaimer Statement -->
			<p class="text-[11px] sm:text-xs text-neutral-500 text-center px-2 mt-2 mb-1 leading-normal select-none">
				By ticking the box below, you confirm that you understand these risks and use the service at your own responsibility.
			</p>

			<!-- Risk Confirmation Banner -->
			<button
				type="button"
				class="w-full bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-xl px-4 py-3 text-xs sm:text-[13px] font-intel flex items-center justify-between gap-3 shadow-xs my-2 cursor-pointer transition-colors text-left shrink-0"
				onclick={() => (riskAccepted = !riskAccepted)}
				onkeydown={(e) => e.key === ' ' && (riskAccepted = !riskAccepted)}
				role="checkbox"
				aria-checked={riskAccepted}
			>
				<span class="leading-snug font-medium flex-1">
					Understand the risks of unofficial API integration before scanning.
				</span>
				<span
					class="w-5 h-5 rounded-md border-2 border-white flex items-center justify-center transition-colors shrink-0 select-none {riskAccepted ? 'bg-white text-[#EF4444]' : 'bg-white/10 text-transparent'}"
				>
					{#if riskAccepted}
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					{/if}
				</span>
			</button>

			<!-- Bottom CTA -->
			<div class="w-full flex flex-col items-center justify-center pt-3 pb-2">
				<button
					type="button"
					onclick={handleContinue}
					disabled={!riskAccepted}
					class="text-sm font-intel transition-colors select-none {riskAccepted ? 'text-[#5FD068] hover:text-[#1ED10E] cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}"
					title={riskAccepted ? 'Click to continue' : 'Please tick the risk confirmation box above to continue'}
				>
					&rarr; Click here to continue...
				</button>
				{#if !riskAccepted}
					<span class="text-[11px] text-neutral-400 mt-1 select-none text-center">
						* Please tick the confirmation box above to proceed
					</span>
				{/if}
			</div>
		</div>
	</div>
{/if}
