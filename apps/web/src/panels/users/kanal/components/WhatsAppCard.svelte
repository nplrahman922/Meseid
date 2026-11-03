<script lang="ts">
	import type { WhatsAppChannelState } from '../kanal.types';

	interface Props {
		channelState?: WhatsAppChannelState;
		onReconnect?: () => void;
		onDisconnect?: () => void;
		onGenerateOtp?: () => void;
	}

	let {
		channelState = $bindable({
			status: 'connected',
			businessName: 'Warung Bu Rina',
			phoneNumberMasked: '***** 0123',
			qrCaption: 'Contoh area pairing. Bukan QR yang dapat dipindai.',
			otpCode: '••••••••••••••••••••',
			isGeneratingOtp: false
		}),
		onReconnect,
		onDisconnect,
		onGenerateOtp
	}: Props = $props();

	function handleGenerateOtp() {
		channelState.isGeneratingOtp = true;
		setTimeout(() => {
			const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
			channelState.otpCode = `MS-${randomCode}`;
			channelState.isGeneratingOtp = false;
			if (onGenerateOtp) onGenerateOtp();
		}, 400);
	}

	function handleReconnect() {
		if (onReconnect) {
			onReconnect();
		} else {
			channelState.status = 'connected';
		}
	}

	function handleDisconnect() {
		if (onDisconnect) {
			onDisconnect();
		} else {
			channelState.status = channelState.status === 'connected' ? 'disconnected' : 'connected';
		}
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
		{:else}
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5]">
				<span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
				Terputus
			</span>
		{/if}
	</div>

	<!-- Connected Account Text -->
	<div class="text-xs sm:text-sm font-intel text-[#4B5563]">
		{channelState.businessName} · Nomor demo {channelState.phoneNumberMasked}
	</div>

	<!-- QR Mock Box -->
	<div class="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl py-12 flex flex-col items-center justify-center text-center space-y-1">
		<div class="text-xs sm:text-sm font-intel tracking-widest text-[#6B7280]">
			[ QR ]
		</div>
		<div class="text-[11px] font-intel uppercase tracking-wider text-[#9CA3AF]">
			DEMO / NON-AKTIF
		</div>
	</div>

	<!-- QR Caption -->
	<p class="text-[11px] sm:text-xs font-inter text-[#6B7280]">
		{channelState.qrCaption}
	</p>

	<!-- Action Buttons -->
	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			onclick={handleReconnect}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Hubungkan ulang
		</button>
		<button
			type="button"
			onclick={handleDisconnect}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			{channelState.status === 'connected' ? 'Putuskan koneksi' : 'Sambungkan'}
		</button>
	</div>

	<!-- Warning / Disclaimer Text -->
	<p class="text-[11px] sm:text-xs font-inter text-[#6B7280] leading-relaxed">
		Jika terputus, bot berhenti menerima pesan dari kanal ini. Pasang ulang menggunakan perangkat usaha.
	</p>

	<!-- Generate OTP Sub-section -->
	<div class="pt-4 border-t border-[#F3F4F6] space-y-2.5">
		<label for="wa-otp-input" class="block text-xs sm:text-sm font-intel font-medium text-[#111111]">
			Generate OTP
		</label>
		<input
			id="wa-otp-input"
			type="text"
			readonly
			value={channelState.otpCode}
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel tracking-widest text-[#111111] focus:outline-none"
		/>
		<p class="text-[11px] font-inter text-[#9CA3AF]">
			** Kode OTP hanya berlaku selama 5 menit.
		</p>
		<button
			type="button"
			disabled={channelState.isGeneratingOtp}
			onclick={handleGenerateOtp}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F9FAFB] transition-colors cursor-pointer disabled:opacity-50"
		>
			{channelState.isGeneratingOtp ? 'Membuat Kode...' : 'Generate Kode OTP'}
		</button>
	</div>
</div>
