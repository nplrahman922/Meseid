<script lang="ts">
	interface Props {
		isActive?: boolean;
	}

	let { isActive = true }: Props = $props();

	const items = [
		{
			title: 'A Google Account',
			desc: 'For sign-in, Google Drive, and Google Calendar.'
		},
		{
			title: 'A number for the bot',
			desc: 'A WhatsApp number, or a Telegram bot token from BotFather.'
		},
		{
			title: 'A Drive folder',
			desc: 'Where your reports and receipts will be stored.'
		}
	];
</script>

<section class="w-full max-w-6xl mx-auto px-6 py-6 md:py-10">
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
		<!-- Left: Checklist with Outline Checkboxes and Intro/Outro -->
		<div
			class="lg:col-span-7 space-y-6 transition-all duration-700 ease-out {isActive
				? 'opacity-100 translate-x-0'
				: 'opacity-0 -translate-x-8'}"
		>
			<div class="space-y-1">
				<h2 class="text-3xl sm:text-4xl lg:text-5xl font-intel text-neutral-900 tracking-tight">
					What You'll Need
				</h2>
				<p class="font-intel font-light text-sm sm:text-base text-neutral-600">
					Have these ready before you begin.
				</p>
			</div>

			<div class="space-y-4 pt-1">
				{#each items as item, index}
					<div
						class="space-y-2 {index < items.length - 1 ? 'border-b border-neutral-200/80 pb-4' : ''}"
					>
						<div class="flex items-start gap-4">
							<!-- Rounded outline checkbox matching cp_sec4.png -->
							<div
								class="w-5 h-5 rounded-md border-2 border-[#1dd205] flex-shrink-0 mt-0.5"
								aria-hidden="true"
							></div>

							<div class="space-y-0.5">
								<h3 class="font-intel text-base sm:text-lg text-neutral-900 font-medium">
									{item.title}
								</h3>
								<p class="font-intel font-light text-xs sm:text-sm text-neutral-500 leading-relaxed">
									{item.desc}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Right: Green Stroke Speech Bubble Icon with Pop-in Intro/Outro -->
		<div
			class="lg:col-span-5 flex justify-center items-center transition-all duration-700 ease-out delay-150 {isActive
				? 'opacity-100 translate-x-0 scale-100'
				: 'opacity-0 translate-x-8 scale-90'}"
		>
			<div class="w-48 sm:w-56 md:w-64">
				<svg
					viewBox="0 0 200 180"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					class="w-full h-auto drop-shadow-xs transition-transform duration-300 hover:scale-105"
				>
					<path
						d="M25 25C25 16.7157 31.7157 10 40 10H155C163.284 10 170 16.7157 170 25V115C170 123.284 163.284 130 155 130H65L35 155V130H40C31.7157 130 25 123.284 25 115V25Z"
						stroke="#1DD205"
						stroke-width="9"
						stroke-linecap="round"
						stroke-linejoin="round"
						transform="matrix(-1 0 0 1 195 0)"
					/>
					<line x1="50" y1="55" x2="140" y2="55" stroke="#1DD205" stroke-width="8.5" stroke-linecap="round" />
					<line x1="50" y1="88" x2="140" y2="88" stroke="#1DD205" stroke-width="8.5" stroke-linecap="round" />
				</svg>
			</div>
		</div>
	</div>
</section>
