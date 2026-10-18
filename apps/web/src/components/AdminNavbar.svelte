<script lang="ts">
	interface Props {
		adminName?: string;
		dateText?: string;
		onRefresh?: () => void;
		onHelpClick?: () => void;
		onToggleSidebar?: () => void;
	}

	let {
		adminName = 'System Admin · Dewi',
		dateText = '16 Oktober 2026 · 14.30 WIB',
		onRefresh,
		onHelpClick,
		onToggleSidebar
	}: Props = $props();

	let isRefreshing = $state(false);

	function handleRefreshClick() {
		isRefreshing = true;
		if (onRefresh) {
			onRefresh();
		}
		setTimeout(() => {
			isRefreshing = false;
		}, 600);
	}
</script>

<!-- Admin Top Navbar (Full Width Dark Green #0E6B2B matching navbar-admin.png) -->
<header
	class="w-full text-white h-16 sm:h-18 flex items-center justify-between px-4 sm:px-6 md:px-8 select-none z-30 shrink-0 shadow-sm"
	style="background-color: #0E6B2B;"
>
	<!-- Left Side: Brand logo in a white rounded rectangle block with black text and shadow effect -->
	<div class="flex items-center">
		<a href="/dashboard-admin" class="flex items-center group focus:outline-hidden">
			<div
				class="bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center transition-all duration-150 group-hover:scale-[1.02]"
				style="box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.08);"
			>
				<img
					src="/panel/logo_horizontal.svg"
					alt="Meseid"
					class="h-6 sm:h-7 w-auto object-contain block"
				/>
			</div>
		</a>
	</div>

	<!-- Mobile Toggle Button (Visible on small screens) -->
	<div class="flex md:hidden items-center gap-2">
		<button
			type="button"
			onclick={handleRefreshClick}
			class="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
			aria-label="Perbarui status"
		>
			<svg class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</button>

		<button
			type="button"
			onclick={onToggleSidebar}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-inter text-white transition-colors cursor-pointer"
			aria-label="Toggle navigation menu"
		>
			<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<span>Menu</span>
		</button>
	</div>

	<!-- Desktop Right Info: Admin Role, Date/Time, Refresh & Help -->
	<div class="hidden md:flex items-center gap-6 text-sm font-inter">
		<!-- Role Badge -->
		<span class="text-white/95 font-medium tracking-normal">
			{adminName}
		</span>

		<!-- Date & Time Stamp -->
		<span class="text-white/80 font-normal">
			{dateText}
		</span>

		<!-- Perbarui (Refresh Action Button) -->
		<button
			type="button"
			onclick={handleRefreshClick}
			class="inline-flex items-center gap-1.5 text-white/95 hover:text-white transition-colors cursor-pointer focus:outline-hidden group"
			title="Segarkan data admin"
		>
			<svg
				class="w-4 h-4 transition-transform duration-300 group-hover:rotate-180 {isRefreshing ? 'animate-spin' : ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			<span class="font-medium underline-offset-4 group-hover:underline">Perbarui</span>
		</button>

		<!-- Dot Separator -->
		<span class="text-white/50 select-none">·</span>

		<!-- Bantuan Link -->
		<button
			type="button"
			onclick={onHelpClick}
			class="text-white/95 hover:text-white transition-colors cursor-pointer focus:outline-hidden hover:underline underline-offset-4"
		>
			Bantuan
		</button>
	</div>
</header>
