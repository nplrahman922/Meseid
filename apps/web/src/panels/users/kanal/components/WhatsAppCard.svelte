<script lang="ts">
	import { onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import type { WhatsAppChannelState } from '../kanal.types';
	import { reconnectWhatsapp, disconnectWhatsapp } from '../kanal-bot.service';
	import WhatsAppChangePhoneModal from './WhatsAppChangePhoneModal.svelte';

	interface Props {
		channelState: WhatsAppChannelState;
		onStatusRefresh?: () => void;
	}

	let { channelState = $bindable(), onStatusRefresh }: Props = $props();

	let isProcessing = $state(false);
	let errorMessage = $state('');
	let qrDataUrl = $state('');
	let lastRawQr = $state('');
	let isChangePhoneModalOpen = $state(false);

	// Update QR Data URL whenever raw QR changes
	$effect(() => {
		if (channelState.status === 'qr_ready' && channelState.qrDataUrl && channelState.qrDataUrl !== lastRawQr) {
			lastRawQr = channelState.qrDataUrl;
			QRCode.toDataURL(channelState.qrDataUrl, {
				width: 240,
				margin: 1,
				color: { dark: '#111111', light: '#ffffff' }
			}).then((url) => {
				qrDataUrl = url;
			}).catch((e) => console.error('Failed to generate QR data URL:', e));
		}
	});

	async function handleReconnect() {
		if (isProcessing) return;
		isProcessing = true;
		errorMessage = '';
		channelState.status = 'connecting';

		try {
			const res = await reconnectWhatsapp();
			if (!res.success) {
				errorMessage = res.error || 'Gagal mereset sesi WhatsApp.';
			}
			if (onStatusRefresh) onStatusRefresh();
		} catch (err: any) {
			errorMessage = err.message || 'Terjadi kesalahan jaringan.';
		} finally {
			isProcessing = false;
		}
	}

	async function handleDisconnect() {
		if (isProcessing) return;
		isProcessing = true;
		errorMessage = '';

		try {
			const res = await disconnectWhatsapp();
			if (!res.success) {
				errorMessage = res.error || 'Gagal memutuskan koneksi WhatsApp.';
			} else {
				channelState.status = 'disconnected';
				channelState.phoneNumber = null;
			}
			if (onStatusRefresh) onStatusRefresh();
		} catch (err: any) {
			errorMessage = err.message || 'Terjadi kesalahan saat memutuskan sesi.';
		} finally {
			isProcessing = false;
		}
	}

	function handlePhoneChangeSuccess(newPhone: string) {
		channelState.ownerPhone = newPhone;
		channelState.ownerPhoneVerified = true;
		if (onStatusRefresh) onStatusRefresh();
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title & Status Badge -->
	<div class="flex items-center justify-between">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">WhatsApp</h2>
		{#if channelState.status === 'connected'}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#1ED10E]"></span>
				Terhubung
			</span>
		{:else if channelState.status === 'connecting' || channelState.status === 'qr_ready'}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
				{channelState.status === 'qr_ready' ? 'Menunggu Scan' : 'Menghubungkan...'}
			</span>
		{:else if channelState.status === 'conflict'}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
				Konflik Akun
			</span>
		{:else}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
				Terputus
			</span>
		{/if}
	</div>

	<!-- Connected Account Text -->
	<div class="text-xs sm:text-sm font-intel text-[#4B5563]">
		{#if channelState.status === 'connected' && channelState.phoneNumber}
			{channelState.businessName} · Nomor bot <span class="font-semibold text-[#111111]">+{channelState.phoneNumber}</span>
		{:else}
			{channelState.businessName} · Bot WhatsApp Toko
		{/if}
	</div>

	<!-- QR Area or Active State -->
	{#if channelState.status === 'connected'}
		<div class="w-full bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl py-8 flex flex-col items-center justify-center text-center space-y-2">
			<div class="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<div class="text-xs sm:text-sm font-intel font-medium text-[#166534]">
				Bot WhatsApp Aktif & Siap Menerima Pesan
			</div>
			<p class="text-[11px] font-inter text-[#15803D] max-w-sm">
				Bot siap melayani chat pelanggan, pencatatan transaksi kas, dan pembacaan struk belanja.
			</p>
		</div>
	{:else if channelState.status === 'qr_ready' && qrDataUrl}
		<div class="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl py-6 flex flex-col items-center justify-center text-center space-y-3">
			<div class="p-2 bg-white rounded-xl border border-[#E5E7EB] shadow-xs">
				<img src={qrDataUrl} alt="Scan QR WhatsApp" class="w-52 h-52 object-contain" />
			</div>
			<p class="text-xs font-inter text-[#4B5563] max-w-xs leading-relaxed">
				Buka WhatsApp di HP Anda &gt; <b>Perangkat Tertaut</b> &gt; <b>Tautkan Perangkat</b> lalu scan QR di atas.
			</p>
		</div>
	{:else}
		<div class="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl py-10 flex flex-col items-center justify-center text-center space-y-2">
			<div class="text-xs sm:text-sm font-intel tracking-widest text-[#6B7280]">
				[ QR CODE ]
			</div>
			<p class="text-[11px] font-inter text-[#9CA3AF] max-w-xs">
				{channelState.status === 'connecting' ? 'Menyiapkan sesi QR Baileys...' : 'Klik "Hubungkan ulang" untuk menghasilkan QR Code baru.'}
			</p>
		</div>
	{/if}

	{#if errorMessage || channelState.conflictReason}
		<div class="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-inter text-[#EF4444] leading-relaxed">
			{errorMessage || channelState.conflictReason}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			disabled={isProcessing}
			onclick={handleReconnect}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-50"
		>
			{isProcessing ? 'Memproses...' : 'Hubungkan ulang'}
		</button>
		{#if channelState.status === 'connected'}
			<button
				type="button"
				disabled={isProcessing}
				onclick={handleDisconnect}
				class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#EF4444] bg-white border border-[#FCA5A5] rounded-xl hover:bg-[#FEF2F2] transition-colors cursor-pointer disabled:opacity-50"
			>
				Putuskan koneksi
			</button>
		{/if}
	</div>

	<!-- Verified Owner Contact Status Footer -->
	<div class="pt-4 border-t border-[#F3F4F6] flex items-center justify-between text-xs font-intel gap-2">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="text-[#6B7280]">Nomor Pribadi Owner:</span>
			{#if channelState.ownerPhone}
				<span class="inline-flex items-center gap-1 text-[#0E6B2B] font-medium">
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					+{channelState.ownerPhone} (Terverifikasi)
				</span>
			{:else}
				<span class="text-[#EF4444] font-medium">Belum Terverifikasi</span>
			{/if}
		</div>
		<button
			type="button"
			onclick={() => (isChangePhoneModalOpen = true)}
			class="px-2.5 py-1 text-xs font-intel font-medium text-[#0E6B2B] hover:text-[#0A4D1F] hover:bg-[#E8F9E6] rounded-lg transition-colors cursor-pointer border border-[#C6F0C2] shrink-0"
		>
			{channelState.ownerPhone ? 'Ganti Nomor' : 'Verifikasi Nomor'}
		</button>
	</div>
</div>

<WhatsAppChangePhoneModal
	isOpen={isChangePhoneModalOpen}
	currentPhone={channelState.ownerPhone}
	onClose={() => (isChangePhoneModalOpen = false)}
	onSuccess={handlePhoneChangeSuccess}
/>
