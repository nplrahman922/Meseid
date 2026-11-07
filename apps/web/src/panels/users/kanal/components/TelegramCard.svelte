<script lang="ts">
	import type { TelegramChannelState } from '../kanal.types';
	import { testTelegramConnection, disconnectTelegram } from '../kanal-bot.service';
	import TelegramTokenModal from './TelegramTokenModal.svelte';
	import TelegramOwnerOtpModal from './TelegramOwnerOtpModal.svelte';

	interface Props {
		channelState: TelegramChannelState;
		onStatusRefresh?: () => void;
	}

	let { channelState = $bindable(), onStatusRefresh }: Props = $props();

	let isTesting = $state(false);
	let isDisconnecting = $state(false);
	let isTokenModalOpen = $state(false);
	let isOwnerOtpModalOpen = $state(false);
	let testFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	async function handleTest() {
		if (isTesting) return;
		isTesting = true;
		testFeedback = null;

		try {
			const res = await testTelegramConnection();
			if (res.success && res.healthy) {
				channelState.webhookStatus = 'healthy';
				channelState.webhookDetail = `Bot @${res.bot?.username || channelState.botUsername} merespons OK (200)`;
				testFeedback = {
					type: 'success',
					message: `Koneksi aktif! Bot @${res.bot?.username || 'Telegram'} berhasil merespons.`
				};
			} else {
				channelState.webhookStatus = 'error';
				channelState.webhookDetail = res.error || 'Bot tidak merespons.';
				testFeedback = {
					type: 'error',
					message: res.error || 'Tes koneksi gagal: bot tidak dapat dihubungi.'
				};
			}
		} catch (err: any) {
			channelState.webhookStatus = 'error';
			testFeedback = {
				type: 'error',
				message: err.message || 'Kesalahan jaringan saat menguji koneksi.'
			};
		} finally {
			isTesting = false;
		}
	}

	async function handleDisconnect() {
		if (isDisconnecting) return;
		isDisconnecting = true;
		testFeedback = null;

		try {
			const res = await disconnectTelegram();
			if (res.success) {
				channelState.status = 'disconnected';
				channelState.tokenMasked = '';
				channelState.botUsername = '';
				if (onStatusRefresh) onStatusRefresh();
			} else {
				testFeedback = {
					type: 'error',
					message: res.error || 'Gagal memutuskan bot Telegram.'
				};
			}
		} catch (err: any) {
			testFeedback = {
				type: 'error',
				message: err.message || 'Kesalahan jaringan saat memutuskan bot.'
			};
		} finally {
			isDisconnecting = false;
		}
	}

	function handleTokenSuccess(data: { botId: string; username: string }) {
		channelState.status = 'connected';
		channelState.botId = data.botId;
		channelState.botUsername = `@${data.username}`;
		testFeedback = {
			type: 'success',
			message: `Bot @${data.username} berhasil ditautkan!`
		};
		if (onStatusRefresh) onStatusRefresh();
	}

	function handleOwnerOtpSuccess(chatId?: string) {
		testFeedback = {
			type: 'success',
			message: `Akun Telegram Owner berhasil ditautkan${chatId ? ` (ID: ${chatId})` : ''}! Anda sekarang memiliki akses Asisten.`
		};
		if (onStatusRefresh) onStatusRefresh();
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title & Status Badge -->
	<div class="flex items-center justify-between">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">Telegram</h2>
		{#if channelState.status === 'connected'}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#1ED10E]"></span>
				Terhubung
			</span>
		{:else}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
				Terputus
			</span>
		{/if}
	</div>

	<!-- Bot Username -->
	<div class="text-xs sm:text-sm font-intel text-[#4B5563]">
		{#if channelState.botUsername}
			<span class="font-semibold text-[#111111]">{channelState.botUsername}</span>
		{:else}
			<span class="text-[#9CA3AF]">Belum ada bot Telegram yang ditautkan</span>
		{/if}
	</div>

	<!-- Token Bot Input -->
	<div class="space-y-1.5">
		<label for="tg-token-input" class="block text-xs sm:text-sm font-intel font-medium text-[#111111]">
			Token bot
		</label>
		<input
			id="tg-token-input"
			type="text"
			readonly
			value={channelState.tokenMasked || '••••••••••••••••••••••••••••••••••••'}
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel tracking-widest text-[#111111] focus:outline-none"
		/>
		<p class="text-[11px] font-inter text-[#9CA3AF]">
			Token bot tersimpan aman dan terenkripsi pada server Meseid.
		</p>
	</div>

	<!-- Webhook / Status Info -->
	{#if channelState.status === 'connected'}
		<div class="space-y-0.5 text-xs sm:text-sm font-intel">
			<div class="flex items-center gap-2 text-[#111111]">
				<span class="font-medium">Konektivitas</span>
				<span class="text-[#9CA3AF]">/</span>
				{#if channelState.webhookStatus === 'healthy'}
					<span class="text-[#0E6B2B] font-medium">Aktif & Sehat</span>
				{:else if channelState.webhookStatus === 'error'}
					<span class="text-[#EF4444] font-medium">Bermasalah</span>
				{:else}
					<span class="text-[#6B7280] font-medium">Siap Diuji</span>
				{/if}
			</div>
			<div class="text-[11px] sm:text-xs font-inter text-[#6B7280]">
				{channelState.webhookDetail || 'Bot mendengarkan pesan transaksi pelanggan.'}
			</div>
		</div>
	{/if}

	{#if testFeedback}
		<div
			class="p-3.5 rounded-xl text-xs font-inter leading-relaxed {testFeedback.type === 'success' ? 'bg-[#E8F9E6] border border-[#C6F0C2] text-[#0E6B2B]' : 'bg-[#FEF2F2] border border-[#FCA5A5] text-[#EF4444]'}"
		>
			{testFeedback.message}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			onclick={() => (isTokenModalOpen = true)}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			{channelState.status === 'connected' ? 'Ganti token' : 'Tautkan bot'}
		</button>
		{#if channelState.status === 'connected'}
			<button
				type="button"
				disabled={isTesting}
				onclick={handleTest}
				class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-50"
			>
				{isTesting ? 'Menguji...' : 'Tes koneksi'}
			</button>
			<button
				type="button"
				disabled={isDisconnecting}
				onclick={handleDisconnect}
				class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#EF4444] bg-white border border-[#FCA5A5] rounded-xl hover:bg-[#FEF2F2] transition-colors cursor-pointer disabled:opacity-50"
			>
				{isDisconnecting ? 'Memutuskan...' : 'Putuskan bot'}
			</button>
		{/if}
	</div>

	<!-- Owner Telegram Account Status / Binding Footer -->
	<div class="pt-4 border-t border-[#F3F4F6] flex items-center justify-between text-xs font-intel gap-2">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="text-[#6B7280]">Akun Telegram Owner:</span>
			<span class="text-[#111111] font-medium">Akses Asisten & Owner</span>
		</div>
		<button
			type="button"
			disabled={channelState.status !== 'connected'}
			onclick={() => (isOwnerOtpModalOpen = true)}
			class="px-2.5 py-1 text-xs font-intel font-medium text-[#0E6B2B] hover:text-[#0A4D1F] hover:bg-[#E8F9E6] rounded-lg transition-colors cursor-pointer border border-[#C6F0C2] shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
		>
			Tautkan via /otp
		</button>
	</div>

	<!-- Security Callout Box -->
	<div class="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-inter text-[#4B5563] leading-relaxed">
		Gunakan token resmi dari @BotFather. Satu token Telegram hanya boleh digunakan oleh satu akun bisnis Meseid.
	</div>
</div>

<TelegramTokenModal
	isOpen={isTokenModalOpen}
	onClose={() => (isTokenModalOpen = false)}
	onSuccess={handleTokenSuccess}
/>

<TelegramOwnerOtpModal
	isOpen={isOwnerOtpModalOpen}
	botUsername={channelState.botUsername}
	onClose={() => (isOwnerOtpModalOpen = false)}
	onSuccess={handleOwnerOtpSuccess}
/>
