<script lang="ts">
	import { verifyTelegramToken } from '../overviewService';

	interface Props {
		isOpen: boolean;
		initialToken?: string;
		initialUsername?: string;
		onClose: () => void;
		onSave: (token: string, username?: string) => void;
	}

	let {
		isOpen,
		initialToken = '',
		initialUsername = '',
		onClose,
		onSave
	}: Props = $props();

	let token = $state('');
	let verifiedUsername = $state('');
	let showSafetyDetails = $state(false);
	let isVerifying = $state(false);
	let verifyError = $state('');
	let isVerified = $state(false);

	let hasToken = $derived(token.trim().length > 0);

	$effect(() => {
		if (isOpen) {
			token = initialToken;
			verifiedUsername = initialUsername;
			isVerified = Boolean(initialToken && initialToken.trim().length > 0 && initialUsername);
			verifyError = '';
		}
	});

	async function handleVerify() {
		if (!hasToken || isVerifying) return;
		isVerifying = true;
		verifyError = '';

		try {
			const res = await verifyTelegramToken(token.trim());
			if (res.success && res.username) {
				verifiedUsername = res.username;
				isVerified = true;
				verifyError = '';
			} else {
				isVerified = false;
				verifiedUsername = '';
				verifyError = res.error || 'Connection failed: Invalid token or bot unreachable.';
			}
		} catch (err: any) {
			isVerified = false;
			verifiedUsername = '';
			verifyError = err.message || 'Connection failed: Network error.';
		} finally {
			isVerifying = false;
		}
	}

	function handleContinue() {
		if (!isVerified && !hasToken) return;
		onSave(token.trim(), verifiedUsername);
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === 'Enter' && !isVerifying) {
			if (!isVerified) {
				handleVerify();
			} else {
				handleContinue();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="telegram-modal-title"
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
			<h2 id="telegram-modal-title" class="text-xl sm:text-2xl text-[#111111] font-normal text-center mb-1 tracking-tight">
				Connect Store Telegram Bot
			</h2>
			<p class="text-xs text-neutral-500 text-center mb-3">
				Enter your custom bot token created via Telegram @BotFather
			</p>

			<!-- BotFather Image -->
			<div class="flex items-center justify-center w-full my-1">
				<img
					src="/img/Botfather.webp"
					alt="BotFather"
					class="w-32 sm:w-40 h-auto object-contain pointer-events-none select-none"
				/>
			</div>

			<!-- Status Feedback Banner (in English) -->
			{#if isVerifying}
				<div class="w-full my-2.5 p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
					<div class="w-4 h-4 border-2 border-sky-300 border-t-sky-700 rounded-full animate-spin shrink-0"></div>
					<span class="font-medium">Verifying bot token with Telegram...</span>
				</div>
			{:else if isVerified && verifiedUsername}
				<div class="w-full my-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
					<div class="flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
						<span class="font-medium">Connected successfully as <strong class="text-emerald-950">@{verifiedUsername}</strong></span>
					</div>
					<svg class="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
			{:else if verifyError}
				<div class="w-full my-2.5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
					<span class="font-bold text-red-600">[!]</span>
					<span class="leading-relaxed">{verifyError}</span>
				</div>
			{/if}

			<!-- Input Section -->
			<div class="w-full my-2">
				<label for="telegram-token-input" class="block text-xs sm:text-sm text-[#111111] mb-1.5 font-normal">
					Type Your Telegram Bot Token
				</label>
				<div class="flex items-center gap-2">
					<input
						id="telegram-token-input"
						type="text"
						bind:value={token}
						oninput={() => {
							if (isVerified) {
								isVerified = false;
								verifiedUsername = '';
							}
							verifyError = '';
						}}
						placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz..."
						class="flex-1 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-xs sm:text-sm font-intel text-[#111111] placeholder:text-neutral-400 outline-none focus:outline-none focus:border-[#5FD068] focus:ring-2 focus:ring-[#5FD068]/20 transition-all font-mono"
					/>
					<button
						type="button"
						onclick={handleVerify}
						disabled={!hasToken || isVerifying}
						class="px-4 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
					>
						{isVerifying ? 'Checking...' : isVerified ? 'Verified' : 'Verify'}
					</button>
				</div>
			</div>

			<!-- Instructions -->
			<div class="w-full text-left text-xs sm:text-[13px] text-[#111111] leading-relaxed space-y-1 my-2">
				<p class="font-normal mb-1">How to Connect Your Telegram Bot:</p>
				<p>1. Open Telegram and search for the official @BotFather account (with the verified badge).</p>
				<p>2. Send the /newbot command to initiate bot creation.</p>
				<p>3. Enter your bot's display name (e.g., App Alert Bot).</p>
				<p>4. Enter a unique username ending with bot (e.g., app_alert_notif_bot).</p>
				<p>5. Copy the HTTP API Token from BotFather.</p>
				<p>6. Paste the token above and click Verify.</p>
				<div class="pt-1.5">
					<button
						type="button"
						onclick={() => (showSafetyDetails = !showSafetyDetails)}
						class="text-xs text-[#EF4444] hover:text-[#DC2626] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
						aria-expanded={showSafetyDetails}
					>
						<span>&rarr; Read Important Safety !</span>
						<span class="text-[11px] underline">({showSafetyDetails ? 'Hide details' : 'Click to view'})</span>
					</button>
				</div>
			</div>

			<!-- Safety Information Card -->
			{#if showSafetyDetails}
				<div
					class="w-full my-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs sm:text-[13px] text-[#111111] leading-relaxed space-y-2.5 font-intel animate-in fade-in duration-200"
				>
					<div class="flex items-center justify-between pb-1 border-b border-amber-200/60">
						<span class="font-semibold text-[#D97706]">Telegram Bot Best Practices</span>
						<button
							type="button"
							onclick={() => (showSafetyDetails = false)}
							class="text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer font-medium"
						>
							Close &times;
						</button>
					</div>

					<div class="space-y-2 text-neutral-700 text-xs">
						<p>
							<strong class="text-neutral-900">• Keep Token Private:</strong>
							Your API token grants control over the bot. Keep it safe.
						</p>
						<p>
							<strong class="text-neutral-900">• Group Privacy Setting:</strong>
							To allow your bot to read group orders, send <code class="px-1 py-0.5 rounded bg-amber-100 text-[#B45309] font-mono">/setprivacy</code> to <span class="font-semibold text-neutral-900">Disabled</span> in @BotFather.
						</p>
					</div>
				</div>
			{/if}

			<!-- Bottom CTA -->
			<div class="w-full flex flex-col items-center justify-center pt-3 pb-2">
				<button
					type="button"
					onclick={handleContinue}
					disabled={!isVerified}
					class="text-sm font-intel transition-colors select-none {isVerified ? 'text-[#5FD068] hover:text-[#1ED10E] cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}"
					title={isVerified ? 'Click to continue' : 'Please verify your token to proceed'}
				>
					&rarr; Click here to continue...
				</button>
				{#if !isVerified}
					<span class="text-[11px] text-neutral-400 mt-1 select-none text-center">
						* Please click Verify to confirm your Telegram bot token
					</span>
				{/if}
			</div>
		</div>
	</div>
{/if}
