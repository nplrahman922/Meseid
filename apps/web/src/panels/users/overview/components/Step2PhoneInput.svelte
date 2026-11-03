<script module lang="ts">
	export interface Country {
		code: string;
		name: string;
		dialCode: string;
	}

	export const COUNTRIES: Country[] = [
		{ code: 'ID', name: 'Indonesia', dialCode: '+62' },
		{ code: 'MY', name: 'Malaysia', dialCode: '+60' },
		{ code: 'SG', name: 'Singapore', dialCode: '+65' },
		{ code: 'US', name: 'United States', dialCode: '+1' },
		{ code: 'GB', name: 'United Kingdom', dialCode: '+44' },
		{ code: 'AU', name: 'Australia', dialCode: '+61' },
		{ code: 'PH', name: 'Philippines', dialCode: '+63' },
		{ code: 'TH', name: 'Thailand', dialCode: '+66' },
		{ code: 'VN', name: 'Vietnam', dialCode: '+84' },
		{ code: 'IN', name: 'India', dialCode: '+91' },
		{ code: 'JP', name: 'Japan', dialCode: '+81' },
		{ code: 'KR', name: 'South Korea', dialCode: '+82' },
		{ code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
		{ code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
		{ code: 'DE', name: 'Germany', dialCode: '+49' },
		{ code: 'FR', name: 'France', dialCode: '+33' },
		{ code: 'NL', name: 'Netherlands', dialCode: '+31' }
	];
</script>

<script lang="ts">
	interface Props {
		phoneNumber: string;
		selectedCountry: Country;
		whatsappConnected?: boolean;
		telegramToken?: string;
		phoneError?: string;
		isPhoneValid: boolean;
		isSendingOtp: boolean;
		onCountryChange: (country: Country) => void;
		onPhoneChange: (phone: string) => void;
		onSendOtp: () => void;
		onSwitchToBots: () => void;
	}

	let {
		phoneNumber,
		selectedCountry,
		whatsappConnected = false,
		telegramToken = '',
		phoneError = '',
		isPhoneValid,
		isSendingOtp,
		onCountryChange,
		onPhoneChange,
		onSendOtp,
		onSwitchToBots
	}: Props = $props();

	let isCountryDropdownOpen = $state(false);
	let countrySearchQuery = $state('');

	let filteredCountries = $derived(
		COUNTRIES.filter(
			(c) =>
				c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
				c.dialCode.includes(countrySearchQuery) ||
				c.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
		)
	);
</script>

<div class="w-full max-w-md sm:max-w-lg px-4 sm:px-0 flex flex-col items-center mb-8">
	<!-- Connected Bot Indicator Badge -->
	<div class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 text-neutral-600 text-xs mb-4 font-medium">
		{#if whatsappConnected}
			<span class="w-2 h-2 rounded-full bg-[#5FD068]"></span>
			<span>Sending OTP via connected WhatsApp Bot</span>
		{:else if telegramToken}
			<span class="w-2 h-2 rounded-full bg-[#65BAA9]"></span>
			<span>Sending OTP via connected Telegram Bot</span>
		{/if}
	</div>

	<!-- Owner Identity Notice -->
	<div class="w-full mb-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 leading-relaxed font-intel">
		<strong class="font-semibold text-emerald-950 block mb-1">Owner Personal Identity (Not Store Bot Number)</strong>
		<span>Please enter your personal phone number. When you message your store bot from this number, the bot recognizes you as the Store Owner (accessing Business Assistant & bookkeeping features). Customers will be handled by the Customer Service Admin.</span>
	</div>

	<!-- Phone Input Pill with Country Dropdown -->
	<div class="relative flex items-center w-full rounded-2xl border border-neutral-300 bg-white px-4 sm:px-5 py-3 sm:py-3.5 mb-4 shadow-xs transition-all focus-within:border-[#5FD068] focus-within:ring-2 focus-within:ring-[#5FD068]/20">
		<!-- Country Code Selector Dropdown -->
		<div class="relative">
			<button
				type="button"
				onclick={() => (isCountryDropdownOpen = !isCountryDropdownOpen)}
				class="flex items-center gap-1.5 pr-3 border-r border-neutral-200 text-neutral-700 hover:text-black font-medium text-sm sm:text-base select-none cursor-pointer focus:outline-none"
				aria-expanded={isCountryDropdownOpen}
				aria-haspopup="listbox"
			>
				<span class="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono text-xs font-semibold">{selectedCountry.code}</span>
				<span class="text-xs sm:text-sm font-semibold">{selectedCountry.dialCode}</span>
				<span class="text-[9px] text-neutral-400">▼</span>
			</button>

			{#if isCountryDropdownOpen}
				<!-- Dropdown Menu -->
				<div
					class="absolute top-full left-0 mt-2 z-50 w-64 max-h-60 overflow-y-auto bg-white rounded-2xl border border-neutral-200 shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150"
					role="listbox"
				>
					<!-- Search Input inside Dropdown -->
					<div class="p-1.5 mb-1 border-b border-neutral-100">
						<input
							type="text"
							bind:value={countrySearchQuery}
							placeholder="Search country..."
							class="w-full text-xs font-intel px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 outline-none focus:border-[#5FD068]"
							onclick={(e) => e.stopPropagation()}
						/>
					</div>

					<!-- Countries List -->
					<div class="flex flex-col gap-0.5">
						{#each filteredCountries as country}
							<button
								type="button"
								onclick={() => {
									onCountryChange(country);
									isCountryDropdownOpen = false;
									countrySearchQuery = '';
								}}
								class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs sm:text-sm hover:bg-neutral-100 transition-colors cursor-pointer {
									selectedCountry.code === country.code
										? 'bg-[#5FD068]/10 text-[#5FD068] font-medium'
										: 'text-neutral-700'
								}"
								role="option"
								aria-selected={selectedCountry.code === country.code}
							>
								<div class="flex items-center gap-2 truncate">
									<span class="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono text-[11px] font-semibold">{country.code}</span>
									<span class="truncate">{country.name}</span>
								</div>
								<span class="text-xs text-neutral-400 font-mono shrink-0 pl-2">{country.dialCode}</span>
							</button>
						{/each}
						{#if filteredCountries.length === 0}
							<div class="p-3 text-center text-xs text-neutral-400">
								No country found
							</div>
						{/if}
					</div>
				</div>

				<!-- Click-outside invisible backdrop -->
				<div
					class="fixed inset-0 z-40"
					onclick={() => {
						isCountryDropdownOpen = false;
						countrySearchQuery = '';
					}}
					aria-hidden="true"
				></div>
			{/if}
		</div>

		<!-- Phone Input -->
		<input
			type="tel"
			value={phoneNumber}
			oninput={(e) => onPhoneChange((e.target as HTMLInputElement).value)}
			placeholder="812-3456-7890"
			class="flex-1 bg-transparent text-base sm:text-lg font-intel text-[#111111] placeholder:text-neutral-400 border-0 outline-none focus:outline-none focus:ring-0 pl-3.5 pr-2"
			onkeydown={(e) => e.key === 'Enter' && onSendOtp()}
			autocomplete="tel"
		/>
	</div>

	{#if phoneError}
		<p class="text-xs text-red-500 mb-3 text-center">{phoneError}</p>
	{/if}

	<!-- Primary Action Button: Send OTP -->
	<button
		type="button"
		onclick={onSendOtp}
		disabled={!isPhoneValid || isSendingOtp}
		class="w-full py-4 px-6 rounded-2xl text-white font-medium text-base shadow-xs transition-all flex items-center justify-center gap-2 mb-4 {
			isPhoneValid && !isSendingOtp
				? 'bg-[#5FD068] hover:bg-[#52c847] hover:shadow-md cursor-pointer active:scale-[0.99]'
				: 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
		}"
	>
		{#if isSendingOtp}
			<span>Sending Code...</span>
		{:else}
			<span>Send Verification Code via Bot</span>
			<span>&rarr;</span>
		{/if}
	</button>

	<!-- Switch back to bots link -->
	<button
		type="button"
		onclick={onSwitchToBots}
		class="text-xs text-neutral-500 hover:text-neutral-800 underline transition-colors cursor-pointer"
	>
		&larr; Change connected bot
	</button>
</div>
