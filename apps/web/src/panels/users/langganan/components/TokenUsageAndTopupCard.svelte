<script lang="ts">
	interface Props {
		onTopup?: () => void;
	}

	let { onTopup }: Props = $props();

	const usageData = {
		used: 3600,
		total: 10000,
		percent: 36,
		remaining: 6400,
		resetDate: '1 Nov 2026'
	};
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
	<!-- Left: Kuota Token -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 flex flex-col justify-between">
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-base font-semibold text-[#111111]">
					Kuota token · ilustrasi
				</h2>
				<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]">
					<span class="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
					Masih cukup
				</span>
			</div>

			<!-- Meter Bar & Percentage -->
			<div class="space-y-2">
				<div class="flex items-baseline justify-between font-mono">
					<div class="text-xl sm:text-2xl font-semibold text-[#111111]">
						{usageData.used.toLocaleString('id-ID')} / {usageData.total.toLocaleString('id-ID')}
					</div>
					<div class="text-sm font-semibold text-[#111111]">
						{usageData.percent}%
					</div>
				</div>

				<div class="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
					<div
						class="h-full bg-[#22C55E] rounded-full transition-all duration-300"
						style="width: {usageData.percent}%"
					></div>
				</div>
			</div>

			<p class="text-xs text-[#6B7280]">
				Terpakai {usageData.used.toLocaleString('id-ID')} dari {usageData.total.toLocaleString('id-ID')} ({usageData.percent}%), sisa {usageData.remaining.toLocaleString('id-ID')}. Reset {usageData.resetDate}. Angka ilustratif, bukan batas paket.
			</p>
		</div>

		<!-- Callout -->
		<div class="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3.5 text-xs text-[#166534] leading-relaxed">
			Angka kuota adalah ilustrasi tampilan penggunaan, bukan batas Gratis/Pro. Token dipakai saat bot membaca dan membalas. Reset contoh: 1 November 2026.
		</div>
	</div>

	<!-- Right: Tambah Token -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 flex flex-col justify-between">
		<div class="space-y-3">
			<h2 class="text-base font-semibold text-[#111111]">
				Tambah token
			</h2>
			<div class="text-2xl sm:text-3xl font-intel font-normal text-[#111111]">
				Rp 20.000
			</div>
			<div class="space-y-1">
				<h3 class="text-xs font-semibold text-[#111111]">
					Pembelian top-up terpisah. Tidak mengaktifkan atau memperpanjang Pro.
				</h3>
				<p class="text-xs text-[#6B7280] leading-relaxed">
					Jumlah token dan rincian top-up akan ditampilkan sebelum konfirmasi pembayaran; tidak ditentukan dalam contoh ini.
				</p>
			</div>
		</div>

		<div>
			<button
				type="button"
				onclick={onTopup}
				class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
			>
				Tinjau top-up
			</button>
		</div>
	</div>
</div>
