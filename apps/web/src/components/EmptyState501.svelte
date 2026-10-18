<script lang="ts">
	interface Props {
		title?: string;
		code?: string;
		message?: string;
	}

	let {
		title = 'Coming Soon',
		code = '501',
		message
	}: Props = $props();
</script>

<div class="w-full flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
	<div class="max-w-md sm:max-w-lg w-full flex flex-col items-center justify-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-300">
		<!-- Illustration from /img/501.png -->
		<div class="w-64 sm:w-80 md:w-96 max-w-full aspect-square flex items-center justify-center">
			<img
				src="/img/501.png"
				alt="501 Coming Soon Illustration"
				class="w-full h-full object-contain block drop-shadow-xs transition-transform duration-300 hover:scale-[1.02]"
				loading="eager"
			/>
		</div>

		<!-- 501 Status Code (Matching default-desktop-users.png & default-mobile-users.png) -->
		<div class="space-y-3">
			<div
				class="font-inter font-medium tracking-tight select-none"
				style="font-size: 76px; line-height: 1; color: #86E57F; -webkit-text-stroke: 2px #0E6B2B;"
			>
				{code}
			</div>

			<!-- Title / Subtitle: Coming Soon -->
			<h2 class="font-inter text-2xl sm:text-3xl font-semibold text-[#111111]">
				{title}
			</h2>

			{#if message}
				<p class="font-inter text-sm text-[#6B7280] max-w-sm mx-auto">
					{message}
				</p>
			{/if}
		</div>
	</div>
</div>
