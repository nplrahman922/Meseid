<script lang="ts">
	import PolicyModal from './PolicyModal.svelte';

	interface Props {
		isActive?: boolean;
		onNavigate?: (index: number | 'join-us') => void;
	}

	let { isActive = true, onNavigate }: Props = $props();
	let isPolicyModalOpen = $state(false);

	function openPolicyModal(e: MouseEvent) {
		e.preventDefault();
		isPolicyModalOpen = true;
	}

	function closePolicyModal() {
		isPolicyModalOpen = false;
	}

	function handleJoinUs(e: MouseEvent) {
		e.preventDefault();
		if (onNavigate) {
			onNavigate('join-us');
		}
	}
</script>

<section class="w-full max-w-6xl mx-auto px-6 py-6 md:py-10">
	<div class="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center">
		<!-- Left: Meseid Brand Card with Intro/Outro -->
		<div
			class="md:col-span-5 flex justify-center md:justify-start transition-all duration-700 ease-out {isActive
				? 'opacity-100 translate-x-0 scale-100'
				: 'opacity-0 -translate-x-8 scale-95'}"
		>
			<div class="w-44 sm:w-52 md:w-60">
				<img
					src="/svg/Logo2.svg"
					alt="Meseid"
					class="w-full h-auto object-contain block drop-shadow-sm transition-transform duration-300 hover:scale-105"
				/>
			</div>
		</div>

		<!-- Right: Available on copy, icons, and policy caution with Intro/Outro -->
		<div
			class="md:col-span-7 space-y-5 transition-all duration-700 ease-out delay-100 {isActive
				? 'opacity-100 translate-x-0'
				: 'opacity-0 translate-x-8'}"
		>
			<div class="space-y-1">
				<h2 class="text-3xl sm:text-4xl lg:text-5xl font-intel text-neutral-900 tracking-tight">
					Available On :
				</h2>
				<p class="font-intel font-light text-xs sm:text-sm text-neutral-600">
					We supp our product with platform :
				</p>
			</div>

			<!-- Platform Buttons / Icons -->
			<div class="flex items-center gap-5 pt-2">
				<a
					href="#join-us"
					onclick={handleJoinUs}
					class="inline-block transition-transform duration-200 hover:scale-115 active:scale-95"
					aria-label="Telegram"
				>
					<img
						src="/svg/Telegram.svg"
						alt="Telegram"
						class="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-xs"
					/>
				</a>

				<a
					href="#join-us"
					onclick={handleJoinUs}
					class="inline-block transition-transform duration-200 hover:scale-115 active:scale-95"
					aria-label="WhatsApp"
				>
					<img
						src="/svg/Whatsapp.svg"
						alt="WhatsApp"
						class="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-xs"
					/>
				</a>
			</div>

			<!-- Caution Policy Link opening the Modal -->
			<div class="pt-3">
				<button
					type="button"
					onclick={openPolicyModal}
					class="inline-flex items-center gap-1.5 font-intel text-xs text-red-500 hover:text-red-600 hover:underline transition-all cursor-pointer focus:outline-hidden"
				>
					<span>Read Our Policy With Cautions ! policy...</span>
					<span>📋</span>
				</button>
			</div>
		</div>
	</div>
</section>

<!-- Terms of Service / Policy Modal -->
<PolicyModal isOpen={isPolicyModalOpen} onClose={closePolicyModal} />
