<script lang="ts">
	interface Props {
		isYearly?: boolean;
		onSelectPro?: (interval: 'monthly' | 'yearly') => void;
	}

	let { isYearly = false, onSelectPro }: Props = $props();

	let priceTitle = $derived(isYearly ? 'Rp 490.000/tahun' : 'Rp 49.000/bulan');
	let priceSubtext = $derived(
		isYearly
			? 'Setara Rp 40.833/bulan dengan tagihan tahunan.'
			: 'Atau Rp 490.000/tahun dengan tagihan tahunan.'
	);
	let buttonText = $derived(isYearly ? 'Pilih Pro tahunan' : 'Pilih Pro bulanan');
	let checkoutSummary = $derived(
		isYearly
			? 'Ringkasan checkout: Rp 490.000 · sekali untuk periode tahunan, bukan top-up token.'
			: 'Ringkasan checkout: Rp 49.000 · sekali untuk periode bulanan, bukan top-up token.'
	);

	function handleProClick() {
		onSelectPro?.(isYearly ? 'yearly' : 'monthly');
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
	<!-- Gratis Card -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 space-y-6 flex flex-col justify-between">
		<div class="space-y-5">
			<div>
				<h2 class="text-base sm:text-lg font-semibold text-[#111111]">Gratis</h2>
				<div class="mt-2 text-2xl sm:text-3xl font-intel font-normal text-[#111111]">
					Rp 0
				</div>
				<p class="mt-1 text-xs text-[#6B7280]">
					Untuk mulai merapikan catatan usaha.
				</p>
			</div>

			<div class="space-y-4 pt-2">
				<div class="space-y-1">
					<h3 class="text-xs font-semibold text-[#111111]">Catat lewat chat</h3>
					<p class="text-xs text-[#6B7280] leading-relaxed">
						Kenali alur transaksi dan asisten usaha.
					</p>
				</div>
				<div class="space-y-1">
					<h3 class="text-xs font-semibold text-[#111111]">Ringkasan usaha</h3>
					<p class="text-xs text-[#6B7280] leading-relaxed">
						Lihat catatan dan penggunaan dari dashboard.
					</p>
				</div>
			</div>
		</div>

		<div>
			<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-xs font-medium text-[#111111]">
				<span class="w-2 h-2 rounded-full bg-[#16A34A]"></span>
				Paket Anda
			</span>
		</div>
	</div>

	<!-- Pro Card -->
	<div class="bg-[#F0FDF4] rounded-2xl border border-[#DCFCE7] p-6 sm:p-7 space-y-6 flex flex-col justify-between">
		<div class="space-y-5">
			<div>
				<h2 class="text-base sm:text-lg font-semibold text-[#111111]">Pro</h2>
				<div class="mt-2 text-2xl sm:text-3xl font-intel font-normal text-[#111111]">
					{priceTitle}
				</div>
				<p class="mt-1 text-xs text-[#4B5563]">
					{priceSubtext}
				</p>
			</div>

			<div class="space-y-4 pt-2">
				<div class="space-y-1">
					<h3 class="text-xs font-semibold text-[#111111]">Untuk kebutuhan usaha rutin</h3>
					<p class="text-xs text-[#4B5563] leading-relaxed">
						Lanjutkan penggunaan layanan dengan paket berbayar.
					</p>
				</div>
				<div class="space-y-1">
					<h3 class="text-xs font-semibold text-[#111111]">Tinjau sebelum membayar</h3>
					<p class="text-xs text-[#4B5563] leading-relaxed">
						Rincian fasilitas dan kuota mengikuti penawaran yang disetujui di checkout; tidak ada janji kuota tetap pada contoh ini.
					</p>
				</div>
			</div>
		</div>

		<div class="space-y-3">
			<button
				type="button"
				onclick={handleProClick}
				class="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer"
			>
				{buttonText}
			</button>
			<p class="text-xs text-[#6B7280]">
				{checkoutSummary}
			</p>
		</div>
	</div>
</div>
