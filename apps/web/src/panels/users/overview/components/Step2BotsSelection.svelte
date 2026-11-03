<script lang="ts">
	interface Props {
		whatsappConnected: boolean;
		telegramToken?: string;
		telegramUsername?: string;
		agreedToPolicy: boolean;
		phoneVerified?: boolean;
		fullPhoneNumber?: string;
		telegramVerified?: boolean;
		onChangePhone?: () => void;
		onVerifyTelegramOwner?: () => void;
		onOpenWhatsapp: () => void;
		onOpenTelegram: () => void;
		onOpenTerms: () => void;
		onTogglePolicy: () => void;
	}

	let {
		whatsappConnected,
		telegramToken,
		telegramUsername,
		agreedToPolicy,
		phoneVerified = false,
		fullPhoneNumber = '',
		telegramVerified = false,
		onChangePhone,
		onVerifyTelegramOwner,
		onOpenWhatsapp,
		onOpenTelegram,
		onOpenTerms,
		onTogglePolicy
	}: Props = $props();
</script>

<div class="flex flex-col gap-4 sm:gap-5 w-full max-w-md sm:max-w-lg px-4 sm:px-0 mb-6 font-intel">
	<!-- WhatsApp Button -->
	<button
		type="button"
		onclick={onOpenWhatsapp}
		class="w-full py-4.5 sm:py-5 px-6 rounded-2xl bg-[#5FD068] hover:bg-[#52c847] text-white flex items-center justify-center gap-3.5 sm:gap-4 text-base sm:text-lg font-intel shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
	>
		<span class="font-normal tracking-wide">
			{whatsappConnected ? 'WhatsApp Connected ✓' : 'Connect WhatsApp'}
		</span>
		<img
			src="/svg/overview/Whatsapp-white.svg"
			alt="WhatsApp"
			class="w-6 h-6 sm:w-7 sm:h-7 object-contain"
		/>
	</button>

	<!-- WhatsApp Owner Verified Status Badge -->
	{#if whatsappConnected && phoneVerified && fullPhoneNumber}
		<div class="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 -mt-2">
			<div class="flex items-center gap-2">
				<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
				<span>Nomor Owner Terverifikasi: <strong>{fullPhoneNumber}</strong></span>
			</div>
			{#if onChangePhone}
				<button
					type="button"
					onclick={onChangePhone}
					class="text-emerald-700 hover:text-emerald-950 font-medium underline cursor-pointer"
				>
					Ubah Nomor
				</button>
			{/if}
		</div>
	{/if}

	<!-- Telegram Button -->
	<button
		type="button"
		onclick={onOpenTelegram}
		class="w-full py-4.5 sm:py-5 px-6 rounded-2xl bg-[#65BAA9] hover:bg-[#5aa899] text-white flex items-center justify-center gap-3.5 sm:gap-4 text-base sm:text-lg font-intel shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
	>
		<span class="font-normal tracking-wide">
			{telegramToken
				? (telegramUsername ? `Telegram Connected (@${telegramUsername.replace(/^@/, '')}) ✓` : 'Telegram Connected ✓')
				: 'Connect Telegram'}
		</span>
		<img
			src="/svg/overview/Telegram-white.svg"
			alt="Telegram"
			class="w-6 h-6 sm:w-7 sm:h-7 object-contain"
		/>
	</button>

	<!-- Telegram Owner Verified Status Badge -->
	{#if telegramToken}
		<div class="flex items-center justify-between w-full px-4 py-2.5 rounded-xl {telegramVerified ? 'bg-[#EAF5F3] border border-[#65BAA9]/30 text-[#1E4D45]' : 'bg-amber-50 border border-amber-200 text-amber-900'} text-xs -mt-2">
			<div class="flex items-center gap-2">
				<span class="w-2 h-2 rounded-full {telegramVerified ? 'bg-[#65BAA9]' : 'bg-amber-500'}"></span>
				<span>
					{#if telegramVerified}
						Owner Telegram: <strong>Terverifikasi ✓</strong>
					{:else}
						Owner Telegram: <strong>Belum Diverifikasi</strong>
					{/if}
				</span>
			</div>
			{#if onVerifyTelegramOwner}
				<button
					type="button"
					onclick={onVerifyTelegramOwner}
					class="{telegramVerified ? 'text-[#1E4D45] hover:text-black' : 'text-amber-800 hover:text-amber-950'} font-medium underline cursor-pointer"
				>
					{telegramVerified ? 'Tautkan Ulang' : 'Verifikasi OTP'}
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Terms Link -->
<div class="mb-4">
	<button
		type="button"
		onclick={onOpenTerms}
		class="text-xs sm:text-sm font-intel text-[#EF4444] hover:underline cursor-pointer tracking-tight"
	>
		Read Our Terms Before starts..
	</button>
</div>

<!-- Policy Agreement Checkbox -->
<div
	class="flex items-center justify-center gap-2 mb-8 cursor-pointer text-sm sm:text-base font-intel text-[#111111]"
	onclick={onTogglePolicy}
	onkeydown={(e) => e.key === ' ' && onTogglePolicy()}
	tabindex="0"
	role="checkbox"
	aria-checked={agreedToPolicy}
>
	<span>Agreed with Policy...</span>
	<span class="w-5 h-5 rounded-xs border border-neutral-400 flex items-center justify-center text-xs font-bold bg-white select-none">
		{agreedToPolicy ? '✓' : ''}
	</span>
</div>

