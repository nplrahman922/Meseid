<script lang="ts">
	import type { TelegramChannelState } from '../kanal.types';

	interface Props {
		channelState?: TelegramChannelState;
		onChangeToken?: () => void;
		onTestConnection?: () => void;
		onGenerateOtp?: () => void;
	}

	let {
		channelState = $bindable({
			status: 'connected',
			botUsername: '@warungburina_demo_bot',
			tokenMasked: '••••••••••••••••••••••••••••••••••••',
			webhookStatus: 'healthy',
			webhookDetail: 'Periksa koneksi diberikan OK (200)',
			otpCode: '••••••••••••••••••••••••••••••••••••',
			isGeneratingOtp: false
		}),
		onChangeToken,
		onTestConnection,
		onGenerateOtp
	}: Props = $props();

	let isTesting = $state(false);

	function handleTest() {
		isTesting = true;
		setTimeout(() => {
			isTesting = false;
			if (onTestConnection) {
				onTestConnection();
			} else {
				alert('Tes koneksi Telegram berhasil: Webhook aktif dan merespons OK (200).');
			}
		}, 500);
	}

	function handleGenerateOtp() {
		channelState.isGeneratingOtp = true;
		setTimeout(() => {
			const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
			channelState.otpCode = `TG-${randomCode}`;
			channelState.isGeneratingOtp = false;
			if (onGenerateOtp) onGenerateOtp();
		}, 400);
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
		{channelState.botUsername}
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
			value={channelState.tokenMasked}
			class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm font-intel tracking-widest text-[#111111] focus:outline-none"
		/>
		<p class="text-[11px] font-inter text-[#9CA3AF]">
			Kredensial contoh disamarkan. Tidak ada token nyata.
		</p>
	</div>

	<!-- Webhook Status -->
	<div class="space-y-0.5 text-xs sm:text-sm font-intel">
		<div class="flex items-center gap-2 text-[#111111]">
			<span class="font-medium">Webhook</span>
			<span class="text-[#9CA3AF]">/</span>
			<span class="text-[#0E6B2B] font-medium">Sehat</span>
		</div>
		<div class="text-[11px] sm:text-xs font-inter text-[#6B7280]">
			{channelState.webhookDetail}
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			onclick={onChangeToken}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
		>
			Ganti token
		</button>
		<button
			type="button"
			disabled={isTesting}
			onclick={handleTest}
			class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-white border border-[#111111] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-50"
		>
			{isTesting ? 'Menguji...' : 'Tes koneksi'}
		</button>
	</div>

	<!-- Security Callout Box -->
	<div class="p-3.5 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-xs font-inter text-[#0E6B2B] leading-relaxed">
		Simpan token bot hanya di pengaturan aman. Jangan berikan token ke pelanggan.
	</div>

	<!-- Generate OTP Sub-section -->
	<div class="pt-4 border-t border-[#F3F4F6] space-y-2.5">
		<label for="tg-otp-input" class="block text-xs sm:text-sm font-intel font-medium text-[#111111]">
			Generate OTP
		</label>
		<input
			id="tg-otp-input"
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
