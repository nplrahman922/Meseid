<script lang="ts">
	interface Props {
		onNavigate?: (index: number | 'join-us') => void;
	}

	let { onNavigate }: Props = $props();
	let mobileMenuOpen = $state(false);

	function toggleMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMenu() {
		mobileMenuOpen = false;
	}

	function handleNav(e: MouseEvent, index: number | 'join-us') {
		e.preventDefault();
		closeMenu();
		if (onNavigate) {
			onNavigate(index);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && mobileMenuOpen) {
			closeMenu();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<nav class="w-full bg-white transition-all duration-300">
	<div class="max-w-6xl mx-auto px-6 h-20 md:h-24 flex items-center justify-between">
		<!-- Left: Vector Brand Logo Icon -->
		<a
			href="#start-here"
			class="flex items-center group"
			onclick={(e) => handleNav(e, 0)}
		>
			<img
				src="/svg/Logo.svg"
				alt="Meseid"
				class="h-8 md:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
			/>
		</a>

		<!-- Right: Navigation Links (Matching cp_Navbar.png) -->
		<div class="hidden md:flex items-center gap-10 lg:gap-14 font-inter text-sm md:text-[15px] text-neutral-900">
			<a
				href="#start-here"
				onclick={(e) => handleNav(e, 0)}
				class="hover:text-[#1dd205] transition-colors duration-150"
			>
				Start Here
			</a>
			<a
				href="#guidance"
				onclick={(e) => handleNav(e, 2)}
				class="hover:text-[#1dd205] transition-colors duration-150"
			>
				Guidance
			</a>
			<a
				href="#join-us"
				onclick={(e) => handleNav(e, 'join-us')}
				class="hover:text-[#1dd205] transition-colors duration-150"
			>
				Join Us
			</a>
		</div>

		<!-- Mobile Hamburger -->
		<button
			type="button"
			class="md:hidden p-2 rounded-lg text-neutral-800 hover:text-black hover:bg-neutral-100 focus:outline-none"
			onclick={toggleMenu}
			aria-label="Toggle navigation"
		>
			{#if mobileMenuOpen}
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Mobile Popup / Modal Overlay -->
	{#if mobileMenuOpen}
		<div
			class="fixed inset-0 z-50 md:hidden flex flex-col justify-start"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mobile-menu-title"
		>
			<!-- Backdrop overlay -->
			<button
				type="button"
				class="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-200"
				onclick={closeMenu}
				aria-label="Close menu backdrop"
			></button>

			<!-- Popup Card Container (matching user screenshot) -->
			<div
				class="relative w-full bg-white shadow-2xl border-b border-neutral-200 overflow-hidden z-10 animate-in fade-in slide-in-from-top-4 duration-200"
			>
				<!-- Top Bar: Logo + Close Button -->
				<div class="px-6 h-20 flex items-center justify-between border-b border-neutral-100">
					<a
						href="#start-here"
						class="flex items-center"
						onclick={(e) => handleNav(e, 0)}
					>
						<img
							src="/svg/Logo.svg"
							alt="Meseid"
							class="h-8 w-auto object-contain"
						/>
					</a>

					<button
						type="button"
						class="p-2 -mr-2 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-full transition-colors focus:outline-hidden"
						onclick={closeMenu}
						aria-label="Close navigation"
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Nav Links List -->
				<div class="px-6 py-6 space-y-4 font-inter text-neutral-900 text-sm sm:text-base">
					<a
						href="#start-here"
						class="block py-1 hover:text-[#1dd205] transition-colors"
						onclick={(e) => handleNav(e, 0)}
					>
						Start Here
					</a>
					<a
						href="#guidance"
						class="block py-1 hover:text-[#1dd205] transition-colors"
						onclick={(e) => handleNav(e, 2)}
					>
						Guidance
					</a>
					<a
						href="#join-us"
						class="block py-1 hover:text-[#1dd205] transition-colors"
						onclick={(e) => handleNav(e, 'join-us')}
					>
						Join Us
					</a>
				</div>
			</div>
		</div>
	{/if}
</nav>
