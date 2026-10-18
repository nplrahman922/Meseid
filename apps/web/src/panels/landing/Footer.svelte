<script lang="ts">
	interface Props {
		isActive?: boolean;
		onNavigate?: (index: number | 'join-us') => void;
	}

	let { isActive = true, onNavigate }: Props = $props();

	function handleNav(e: MouseEvent, index: number | 'join-us') {
		e.preventDefault();
		if (onNavigate) {
			onNavigate(index);
		}
	}
</script>

<footer
	class="w-full bg-[#89e781] text-neutral-900 py-6 md:py-8 transition-all duration-700 ease-out {isActive
		? 'opacity-100 translate-y-0'
		: 'opacity-0 translate-y-6'}"
>
	<div class="max-w-6xl mx-auto px-6">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
			<!-- Left: Logo3.svg (Logo with MESEID) + Tagline -->
			<div class="flex items-center gap-5">
				<div class="w-14 sm:w-16 flex-shrink-0">
					<img
						src="/svg/Logo3.svg"
						alt="Meseid"
						class="w-full h-auto object-contain"
					/>
				</div>
				<div class="font-intel text-xs sm:text-[13px] text-neutral-900 leading-snug tracking-wider">
					<div>YOUR BUSINESS ASSISTANT</div>
					<div>IN WHATSAPP AND</div>
					<div>TELEGRAM</div>
				</div>
			</div>

			<!-- Right: Explore Links, Divider, and Copyright -->
			<div class="flex flex-col items-start md:items-end space-y-2">
				<div class="font-intel text-xs text-neutral-800 uppercase tracking-wider w-full text-left">
					EXPLORE
				</div>

				<div class="w-full">
					<!-- Horizontal Links -->
					<div class="flex items-center gap-8 md:gap-12 font-intel text-xs sm:text-sm text-neutral-900 pb-2">
						<a
							href="#start-here"
							onclick={(e) => handleNav(e, 0)}
							class="hover:text-black transition-colors"
						>
							START HERE
						</a>
						<a
							href="#guidance"
							onclick={(e) => handleNav(e, 2)}
							class="hover:text-black transition-colors"
						>
							GUIDANCE
						</a>
						<a
							href="#join-us"
							onclick={(e) => handleNav(e, 'join-us')}
							class="hover:text-black transition-colors"
						>
							JOIN US
						</a>
					</div>

					<!-- Thin Horizontal Underline directly below links -->
					<div class="w-full border-t border-neutral-900/60 my-1"></div>

					<!-- Copyright line -->
					<div class="font-intel text-[11px] sm:text-xs text-neutral-900 pt-1">
						&copy; 2026 MESEID. ALL RIGHT RESERVED.
					</div>
				</div>
			</div>
		</div>
	</div>
</footer>
