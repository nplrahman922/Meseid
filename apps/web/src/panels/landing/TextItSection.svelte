<script lang="ts">
	import Button from '../../components/Button.svelte';

	interface Props {
		isActive?: boolean;
		onNavigate?: (index: number | 'join-us') => void;
	}

	let { isActive = true, onNavigate }: Props = $props();

	function handleTryNow(e: MouseEvent) {
		e.preventDefault();
		if (onNavigate) {
			onNavigate('join-us');
		}
	}
</script>

<section class="w-full max-w-6xl mx-auto px-6 py-6 md:py-10">
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
		<!-- Left: Copy & CTA Button with Intro/Outro -->
		<div
			class="lg:col-span-6 space-y-6 transition-all duration-700 ease-out {isActive
				? 'opacity-100 translate-x-0'
				: 'opacity-0 -translate-x-8'}"
		>
			<div class="space-y-1">
				<h2 class="text-3xl sm:text-4xl lg:text-5xl font-intel tracking-tight text-neutral-900 leading-tight">
					Just text it.
				</h2>
				<p class="text-lg sm:text-2xl font-intel text-neutral-800">
					We'll do the books
				</p>
			</div>

			<p class="font-intel font-light text-sm sm:text-base text-neutral-600 leading-relaxed max-w-md">
				Your AI business assistant lives in WhatsApp and Telegram. Send a receipt, ask for a report, or let it answer your customers, 24/7.
			</p>

			<div class="pt-2">
				<Button
					href="#join-us"
					variant="primary"
					size="md"
					pill={true}
					onclick={handleTryNow}
					class="font-intel bg-[#67d65d] hover:bg-[#55c94b] text-white px-8 py-3 text-base shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
				>
					Try Now..
				</Button>
			</div>
		</div>

		<!-- Right: Live Chat Card Mockup with Intro/Outro -->
		<div
			class="lg:col-span-6 flex justify-center lg:justify-end transition-all duration-700 ease-out delay-150 {isActive
				? 'opacity-100 translate-x-0 scale-100'
				: 'opacity-0 translate-x-8 scale-[0.97]'}"
		>
			<div class="w-full max-w-xs sm:max-w-sm md:max-w-md">
				<img
					src="/img/live_chats_transparent.png"
					alt="Live Chat Mockup"
					class="w-full h-auto object-contain drop-shadow-md rounded-2xl block mx-auto transition-transform duration-300 hover:scale-[1.02]"
					loading="lazy"
				/>
			</div>
		</div>
	</div>
</section>
