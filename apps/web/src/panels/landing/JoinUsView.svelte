<script lang="ts">
	import { onMount } from 'svelte';
	import { loginWithGoogle, redirectIfAuthenticated } from '../../auth/authStore';

	interface Props {
		onBack?: () => void;
	}

	let { onBack }: Props = $props();

	onMount(async () => {
		await redirectIfAuthenticated();
	});

	function handleBack(e?: MouseEvent) {
		if (e) e.preventDefault();
		if (onBack) {
			onBack();
		} else if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		} else if (typeof window !== 'undefined') {
			window.location.href = '/#start-here';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleBack();
		}
	}

	function handleGoogleLogin() {
		loginWithGoogle();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f4fae9] bg-cover bg-center bg-no-repeat overflow-hidden select-none"
	style="background-image: url('/img/Login_background.webp');"
>
	<!-- Top Left: Back Button (Matching Join-Us.png) -->
	<div class="absolute top-6 left-6 sm:top-8 sm:left-8 z-30">
		<button
			type="button"
			onclick={handleBack}
			class="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 border-[#1dd205] bg-white/70 backdrop-blur-xs flex items-center justify-center text-[#1dd205] hover:bg-[#1dd205] hover:text-white transition-all duration-200 shadow-xs hover:scale-105 active:scale-95 cursor-pointer focus:outline-hidden"
			aria-label="Back to landing page"
			title="Back"
		>
			<svg
				class="w-5 h-5 sm:w-6 sm:h-6"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="9 14 4 9 9 4" />
				<path d="M20 20v-7a4 4 0 0 0-4-4H4" />
			</svg>
		</button>
	</div>

	<!-- Center Content Column -->
	<div
		class="relative z-10 flex flex-col items-center justify-center max-w-xl w-full text-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-300"
	>
		<!-- Frosted Glass Meseid Logo Card (Matching Join-Us.png) -->
		<div
			class="relative w-56 sm:w-64 md:w-72 aspect-square rounded-[30px] sm:rounded-[36px] bg-white/70 backdrop-blur-md border border-[#0A7C00]/50 shadow-xl flex flex-col items-center justify-center p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/80"
		>
			<!-- Meseid Icon with Diagonal Line & Antenna -->
			<div class="w-32 sm:w-40 h-24 sm:h-30 flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 358 240"
					class="w-full h-full object-contain"
					fill="none"
				>
					<path
						d="M112 54H202.625C210.909 54 217.625 60.7157 217.625 69V165.338C217.625 173.622 210.909 180.338 202.625 180.338H112C103.716 180.338 97 173.622 97 165.338V69C97 60.7157 103.716 54 112 54Z"
						stroke-width="19"
						stroke="#1DD205"
					/>
					<path
						d="M98.5443 59.0094L95 62.5361L216.375 178.631L219.92 175.104L223.464 171.578L102.089 55.4826L98.5443 59.0094Z"
						fill="#1DD205"
					/>
					<path
						d="M212.388 181.836L216.375 184.854L306.375 56.0759L302.388 53.0585L298.401 50.0411L208.401 178.819L212.388 181.836Z"
						fill="#1DD205"
					/>
					<circle cx="291.5" cy="62.5" r="18.5" fill="#060606" />
				</svg>
			</div>

			<!-- Brand Typography -->
			<h1 class="text-3xl sm:text-4xl md:text-[42px] font-intel font-normal text-neutral-900 tracking-tight mt-1 sm:mt-2">
				Meseid
			</h1>
		</div>

		<!-- Tagline / Greeting (Matching Join-Us.png) -->
		<p class="font-intel text-neutral-900 text-sm sm:text-base md:text-lg tracking-wide font-medium">
			Welcome Back Lets otomate Together ?
		</p>

		<!-- Google Login / Sign Up Button (Matching Join-Us.png) -->
		<div class="pt-1">
			<button
				type="button"
				onclick={handleGoogleLogin}
				class="group relative inline-flex items-center justify-center gap-3.5 sm:gap-4 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm md:text-base font-julius tracking-wider shadow-lg hover:shadow-xl border border-neutral-100 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer focus:outline-hidden"
			>
				<img
					src="/svg/Google.svg"
					alt="Google"
					class="w-5 h-5 sm:w-6 sm:h-6 object-contain transition-transform duration-200 group-hover:scale-110"
				/>
				<span class="uppercase">
					LOGIN OR SIGN UP WITH GOOGLE
				</span>
			</button>
		</div>
	</div>
</div>
