<script lang="ts">
	interface Props {
		breadcrumb?: string;
		dateText?: string;
		onToggleSidebar?: () => void;
		onHelpClick?: () => void;
	}

	let {
		breadcrumb = 'Owner · Beranda',
		dateText = 'Jumat, 16 Okt 2026 · WIB',
		onToggleSidebar,
		onHelpClick
	}: Props = $props();
</script>

<header class="w-full bg-white border-b border-[#E5E7EB] h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 z-20 select-none">
	<!-- Desktop View: Breadcrumb on the left -->
	<div class="hidden md:flex items-center gap-8">
		<span class="font-inter text-sm text-[#111111] font-medium">
			{breadcrumb}
		</span>

		<button
			type="button"
			onclick={onHelpClick}
			class="font-inter text-sm text-[#111111] hover:text-[#0E6B2B] transition-colors cursor-pointer focus:outline-hidden"
		>
			Bantuan
		</button>
	</div>

	<!-- Mobile View: Logo on left, Menu button on right -->
	<div class="flex md:hidden items-center justify-between w-full">
		<a href="/dashboard" class="flex items-center">
			<img
				src="/panel/logo_horizontal.svg"
				alt="Meseid"
				class="h-8 w-auto object-contain"
			/>
		</a>

		<button
			type="button"
			onclick={onToggleSidebar}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm font-inter text-[#111111] hover:bg-[#FAFAFA] active:bg-[#F3F4F6] transition-colors cursor-pointer focus:outline-hidden"
			aria-label="Toggle navigation menu"
		>
			<svg class="w-4 h-4 text-[#111111]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<span>Menu</span>
		</button>
	</div>

	<!-- Desktop View Right: Green Date Stamp -->
	<div class="hidden md:flex items-center">
		<span class="font-inter text-sm font-medium text-[#0E6B2B]">
			{dateText}
		</span>
	</div>
</header>
