<script lang="ts">
	interface Props {
		onConfigureBot?: () => void;
		onNavigateKanal?: () => void;
		onDismiss?: () => void;
	}

	let {
		onConfigureBot,
		onNavigateKanal,
		onDismiss
	}: Props = $props();
</script>

<aside
	role="alert"
	aria-live="polite"
	class="relative w-full rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-50/90 to-amber-100/40 p-4 sm:p-5 shadow-xs font-intel text-neutral-800 transition-all duration-200"
>
	<div class="flex items-start justify-between gap-3 sm:gap-4">
		<!-- Icon Badge -->
		<div
			class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs"
			aria-hidden="true"
		>
			<svg class="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0 space-y-2">
			<!-- Header Line with Tag & Dismiss -->
			<div class="flex items-center gap-2 flex-wrap">
				<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-200/90 text-amber-900 border border-amber-300 select-none">
					<span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
					<span>Peringatan: Bot Belum Diatur</span>
				</span>
				<span class="text-xs text-amber-800 font-medium hidden sm:inline">
					Layanan chat otomatis belum aktif
				</span>
			</div>

			<h3 class="text-sm sm:text-base font-semibold text-amber-950 tracking-tight leading-snug">
				Kanal Bot Toko Belum Dikonfigurasi
			</h3>

			<p class="text-xs sm:text-[13px] text-amber-900/90 leading-relaxed max-w-3xl">
				Akun Anda belum menghubungkan kanal bot (WhatsApp atau Telegram). Pesan dari pelanggan belum dapat dibalas secara otomatis oleh AI Asisten Meseid. Selesaikan pengaturan sekarang agar bot dapat mulai melayani pesanan dan pertanyaan pelanggan 24/7.
			</p>

			<!-- Action Buttons -->
			<div class="pt-2 flex flex-wrap items-center gap-2.5">
				{#if onConfigureBot}
					<button
						type="button"
						onclick={onConfigureBot}
						class="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
					>
						<span>🚀 Konfigurasi Bot Sekarang</span>
						<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				{/if}

				{#if onNavigateKanal}
					<button
						type="button"
						onclick={onNavigateKanal}
						class="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 text-xs font-medium transition-colors cursor-pointer"
					>
						<span>Buka Pengaturan Kanal</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Dismiss Button -->
		{#if onDismiss}
			<button
				type="button"
				onclick={onDismiss}
				class="text-amber-600/70 hover:text-amber-900 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
				title="Tutup peringatan sementara"
				aria-label="Tutup peringatan sementara"
			>
				<span class="text-xl leading-none">&times;</span>
			</button>
		{/if}
	</div>
</aside>
