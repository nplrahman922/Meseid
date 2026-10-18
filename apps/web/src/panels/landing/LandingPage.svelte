<script lang="ts">
	import { onMount } from 'svelte';
	import Navbar from './Navbar.svelte';
	import HeroSection from './HeroSection.svelte';
	import SectionDivider from './SectionDivider.svelte';
	import TextItSection from './TextItSection.svelte';
	import HowItWorksSection from './HowItWorksSection.svelte';
	import WhatYouNeedSection from './WhatYouNeedSection.svelte';
	import QuickSetupSection from './QuickSetupSection.svelte';
	import AvailableOnSection from './AvailableOnSection.svelte';
	import Footer from './Footer.svelte';
	import JoinUsView from './JoinUsView.svelte';

	const totalSections = 6;
	let currentSection = $state(0);
	let isJoinUsActive = $state(false);
	let isScrollingLocked = $state(false);
	let containerRef = $state<HTMLDivElement | null>(null);
	let touchStartY = 0;

	// Progressive circle node positions (percentage 0..100)
	const stages = [
		{ top: 5, bottom: 18 },    // Sec 0: Hero
		{ top: 18, bottom: 36 },   // Sec 1: Just text it
		{ top: 36, bottom: 54 },   // Sec 2: How It Works
		{ top: 54, bottom: 72 },   // Sec 3: What You'll Need
		{ top: 72, bottom: 95 },   // Sec 4: Quick Setup
		{ top: 95, bottom: 95 }    // Sec 5: Available On + Footer
	];

	const sectionHashes = [
		'#start-here',
		'#try-now',
		'#guidance',
		'#what-you-need',
		'#quick-setup',
		'#available-on'
	];

	function openJoinUs() {
		isJoinUsActive = true;
		if (typeof window !== 'undefined' && window.history) {
			window.history.pushState(null, '', '#join-us');
		}
	}

	function closeJoinUs() {
		isJoinUsActive = false;
		if (typeof window !== 'undefined' && window.history) {
			window.history.replaceState(null, '', sectionHashes[currentSection] || '#start-here');
		}
	}

	function goToSection(target: number | 'join-us') {
		if (target === 'join-us') {
			openJoinUs();
			return;
		}

		if (isJoinUsActive) {
			isJoinUsActive = false;
		}

		if (target < 0 || target >= totalSections) return;
		currentSection = target;
		isScrollingLocked = true;

		const targetEl = document.getElementById(`section-${target}`);
		if (targetEl) {
			targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}

		if (typeof window !== 'undefined' && window.history) {
			window.history.replaceState(null, '', sectionHashes[target]);
		}

		setTimeout(() => {
			isScrollingLocked = false;
		}, 750);
	}

	function handleWheel(event: WheelEvent) {
		if (isScrollingLocked) {
			event.preventDefault();
			return;
		}

		if (Math.abs(event.deltaY) > 20) {
			event.preventDefault();

			if (event.deltaY > 0 && currentSection < totalSections - 1) {
				goToSection(currentSection + 1);
			} else if (event.deltaY < 0 && currentSection > 0) {
				goToSection(currentSection - 1);
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
			if (currentSection < totalSections - 1) {
				event.preventDefault();
				goToSection(currentSection + 1);
			}
		} else if (['ArrowUp', 'PageUp'].includes(event.key)) {
			if (currentSection > 0) {
				event.preventDefault();
				goToSection(currentSection - 1);
			}
		}
	}

	function handleTouchStart(event: TouchEvent) {
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (isScrollingLocked) return;
		const diffY = touchStartY - event.changedTouches[0].clientY;
		if (Math.abs(diffY) > 40) {
			if (diffY > 0 && currentSection < totalSections - 1) {
				goToSection(currentSection + 1);
			} else if (diffY < 0 && currentSection > 0) {
				goToSection(currentSection - 1);
			}
		}
	}

	onMount(() => {
		// Use IntersectionObserver to track visible section accurately
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const idx = Number(entry.target.getAttribute('data-section-index'));
						if (!isNaN(idx) && !isScrollingLocked) {
							currentSection = idx;
						}
					}
				}
			},
			{
				root: containerRef,
				threshold: 0.5
			}
		);

		const sections = containerRef?.querySelectorAll('[data-section-index]');
		sections?.forEach((el) => observer.observe(el));

		// Initial hash check
		if (window.location.hash) {
			const hash = window.location.hash;
			if (hash === '#join-us') isJoinUsActive = true;
			else if (hash === '#start-here') goToSection(0);
			else if (hash === '#try-now') goToSection(1);
			else if (hash === '#guidance') goToSection(2);
			else if (hash === '#what-you-need') goToSection(3);
			else if (hash === '#quick-setup') goToSection(4);
			else if (hash === '#available-on') goToSection(5);
		}

		function handleHashChange() {
			if (window.location.hash === '#join-us') {
				isJoinUsActive = true;
			} else if (isJoinUsActive) {
				isJoinUsActive = false;
			}
		}

		window.addEventListener('hashchange', handleHashChange);
		window.addEventListener('popstate', handleHashChange);
		window.addEventListener('keydown', handleKeydown);

		return () => {
			observer.disconnect();
			window.removeEventListener('hashchange', handleHashChange);
			window.removeEventListener('popstate', handleHashChange);
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<title>Meseid — Just text it. We'll do the books.</title>
	<meta
		name="description"
		content="Meseid is your intelligent business accounting assistant inside WhatsApp and Telegram."
	/>
</svelte:head>

<!-- Outer Full-Page Snap Container -->
<div
	bind:this={containerRef}
	role="region"
	aria-label="Meseid presentation slides"
	onwheel={handleWheel}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	class="h-screen w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-white text-neutral-900 scroll-smooth selection:bg-[#55d241]/30 selection:text-neutral-900"
>
	<!-- ================= Section 0: Hero ================= -->
	<div
		id="section-0"
		data-section-index="0"
		class="min-h-screen w-full snap-start flex flex-col justify-between py-2 md:py-3"
	>
		<Navbar onNavigate={goToSection} />
		<div class="flex-1 flex items-center justify-center">
			<HeroSection isActive={currentSection === 0} />
		</div>
		<!-- Bottom Divider of Section 0 -->
		<SectionDivider progress={stages[0].bottom} />
	</div>

	<!-- ================= Section 1: Just text it ================= -->
	<div
		id="section-1"
		data-section-index="1"
		class="min-h-screen w-full snap-start flex flex-col justify-between py-2 md:py-3"
	>
		<!-- Top Divider -->
		<SectionDivider progress={stages[1].top} />
		<div class="flex-1 flex items-center justify-center">
			<TextItSection isActive={currentSection === 1} onNavigate={goToSection} />
		</div>
		<!-- Bottom Divider -->
		<SectionDivider progress={stages[1].bottom} />
	</div>

	<!-- ================= Section 2: How It Works ================= -->
	<div
		id="section-2"
		data-section-index="2"
		class="min-h-screen w-full snap-start flex flex-col justify-between py-2 md:py-3"
	>
		<!-- Top Divider -->
		<SectionDivider progress={stages[2].top} />
		<div class="flex-1 flex items-center justify-center">
			<HowItWorksSection isActive={currentSection === 2} />
		</div>
		<!-- Bottom Divider -->
		<SectionDivider progress={stages[2].bottom} />
	</div>

	<!-- ================= Section 3: What You'll Need ================= -->
	<div
		id="section-3"
		data-section-index="3"
		class="min-h-screen w-full snap-start flex flex-col justify-between py-2 md:py-3"
	>
		<!-- Top Divider -->
		<SectionDivider progress={stages[3].top} />
		<div class="flex-1 flex items-center justify-center">
			<WhatYouNeedSection isActive={currentSection === 3} />
		</div>
		<!-- Bottom Divider -->
		<SectionDivider progress={stages[3].bottom} />
	</div>

	<!-- ================= Section 4: Quick Setup ================= -->
	<div
		id="section-4"
		data-section-index="4"
		class="min-h-screen w-full snap-start flex flex-col justify-between py-2 md:py-3"
	>
		<!-- Top Divider -->
		<SectionDivider progress={stages[4].top} />
		<div class="flex-1 flex items-center justify-center">
			<QuickSetupSection isActive={currentSection === 4} />
		</div>
		<!-- Bottom Divider -->
		<SectionDivider progress={stages[4].bottom} />
	</div>

	<!-- ================= Section 5: Available On & Footer ================= -->
	<div
		id="section-5"
		data-section-index="5"
		class="min-h-screen w-full snap-start flex flex-col justify-between"
	>
		<!-- Top Divider -->
		<SectionDivider progress={stages[5].top} class="pt-2 md:pt-4" />

		<!-- Center: Available On Section -->
		<div class="flex-1 flex items-center justify-center py-2 md:py-4">
			<AvailableOnSection isActive={currentSection === 5} onNavigate={goToSection} />
		</div>

		<!-- Bottom: Footer flush with the screen bottom -->
		<Footer isActive={currentSection === 5} onNavigate={goToSection} />
	</div>
</div>

<!-- Join Us Full-Screen View Overlay (Matching Join-Us.png) -->
{#if isJoinUsActive}
	<div class="fixed inset-0 z-50 animate-in fade-in duration-300">
		<JoinUsView onBack={closeJoinUs} />
	</div>
{/if}
