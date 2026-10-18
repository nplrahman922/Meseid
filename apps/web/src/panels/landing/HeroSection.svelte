<script lang="ts">
	interface Props {
		isActive?: boolean;
	}

	let { isActive = true }: Props = $props();
</script>

<section class="relative w-full py-4 md:py-6 flex flex-col items-center justify-center overflow-hidden">
	<div class="max-w-4xl mx-auto px-6 flex justify-center items-center">
		<div
			class="relative w-full max-w-md sm:max-w-lg md:max-w-xl transition-all duration-700 ease-out {isActive
				? 'opacity-100 translate-y-0 scale-100'
				: 'opacity-0 translate-y-8 scale-[0.97]'}"
		>
			<img
				src="/img/Phone_with_bots_transparent.png"
				alt="Meseid AI Assistant Phone with Bots"
				class="w-full h-auto object-contain block mx-auto transition-transform duration-500 hover:scale-[1.02]"
				loading="eager"
			/>
		</div>
	</div>
</section>
