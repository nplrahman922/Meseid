<script lang="ts">
	interface Props {
		isActive?: boolean;
	}

	let { isActive = true }: Props = $props();

	const steps = [
		{
			num: '1',
			title: 'Connect',
			lines: ['Sign in with Google,', 'then link your WhatsApp', 'or Telegram bot.']
		},
		{
			num: '2',
			title: 'Teach',
			lines: ['Add your products,', 'prices, hours, and FAQ', 'to the knowledge base.']
		},
		{
			num: '3',
			title: 'Chat',
			lines: ['Text your assistant.', 'Customers get instant', 'answers while you work.']
		}
	];
</script>

<section class="w-full max-w-6xl mx-auto px-6 py-6 md:py-10 space-y-8">
	<!-- Section Header -->
	<div
		class="space-y-2 transition-all duration-700 ease-out {isActive
			? 'opacity-100 translate-y-0'
			: 'opacity-0 -translate-y-6'}"
	>
		<h2 class="text-3xl sm:text-4xl lg:text-5xl font-intel text-neutral-900 tracking-tight">
			How It Works
		</h2>
		<p class="font-intel font-light text-sm sm:text-base text-neutral-600">
			Three steps. Most owners finish setup in one sitting.
		</p>
	</div>

	<!-- Steps Flow with Connecting Line -->
	<div class="relative pt-4">
		<!-- Connecting Line across the 3 step numbers -->
		<div
			class="hidden md:block absolute top-[38px] left-[5%] right-[5%] h-[2px] bg-[#55d241] -z-0 transition-transform duration-700 ease-out {isActive
				? 'scale-x-100 opacity-100'
				: 'scale-x-0 opacity-0'}"
			aria-hidden="true"
		></div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
			{#each steps as step, index (step.num)}
				<div
					class="flex flex-col items-start relative z-10 transition-all duration-700 ease-out {isActive
						? 'opacity-100 translate-y-0'
						: 'opacity-0 translate-y-8'}"
					style="transition-delay: {index * 120}ms;"
				>
					<!-- Step Number Circle -->
					<div
						class="w-12 h-12 rounded-full bg-[#55d241] text-white flex items-center justify-center font-intel font-medium text-lg ring-8 ring-white shadow-xs transition-transform duration-300 hover:scale-110"
					>
						{step.num}
					</div>

					<!-- Step Title -->
					<h3 class="font-intel text-xl font-normal text-neutral-900 mt-5 mb-2">
						{step.title}
					</h3>

					<!-- Step Description -->
					<div class="font-intel font-light text-xs sm:text-sm text-neutral-600 leading-relaxed space-y-0.5">
						{#each step.lines as line}
							<div>{line}</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
