<script lang="ts">
	interface Props {
		progress?: number; // 0 to 100 percentage
		class?: string;
	}

	let { progress = 50, class: customClass = '' }: Props = $props();
</script>

<div class="relative w-full max-w-5xl mx-auto py-4 md:py-6 flex items-center {customClass}">
	<!-- Thin horizontal track line -->
	<div class="absolute inset-0 flex items-center" aria-hidden="true">
		<div class="w-full border-t border-[#9de791]"></div>
	</div>

	<!-- Animated circular node traveling along the line -->
	<div
		class="relative transition-all duration-700 ease-out flex items-center justify-center -translate-x-1/2"
		style="left: {Math.max(2, Math.min(98, progress))}%;"
	>
		<span class="w-3.5 h-3.5 rounded-full border-2 border-[#55d241] bg-white ring-4 ring-white shadow-xs"></span>
	</div>
</div>
