<script lang="ts">
	interface Props {
		isActive?: boolean;
	}

	let { isActive = true }: Props = $props();

	const steps = [
		'Sign in with Google',
		'Fill in your business profile',
		'Link your own number to your account',
		'Connect your WhatsApp or Telegram bot',
		'Choose your Drive folder and calendar',
		'Set your assistant\'s style and add your knowledge base'
	];
</script>

<section class="w-full max-w-6xl mx-auto px-6 py-6 md:py-10">
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
		<!-- Left: 6 Numbered Steps with Cascade Intro/Outro -->
		<div class="lg:col-span-7 order-2 lg:order-1 space-y-3.5">
			{#each steps as step, index}
				<div
					class="flex items-baseline gap-3 transition-all duration-700 ease-out {isActive
						? 'opacity-100 translate-x-0'
						: 'opacity-0 -translate-x-6'}"
					style="transition-delay: {index * 70}ms;"
				>
					<span class="font-intel font-normal text-[#1dd205] text-base sm:text-lg min-w-[24px]">
						{index + 1}.
					</span>
					<span class="font-intel font-normal text-neutral-800 text-sm sm:text-base leading-relaxed">
						{step}
					</span>
				</div>
			{/each}
		</div>

		<!-- Right: Quick Setup Heading with Intro/Outro -->
		<div
			class="lg:col-span-5 order-1 lg:order-2 flex flex-col items-start lg:items-end text-left lg:text-right space-y-1 transition-all duration-700 ease-out {isActive
				? 'opacity-100 translate-x-0'
				: 'opacity-0 translate-x-6'}"
		>
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-intel text-neutral-900 tracking-tight">
				Quick Setup
			</h2>
			<p class="font-intel font-light text-sm sm:text-base text-neutral-600">
				In This Order
			</p>
		</div>
	</div>
</section>
