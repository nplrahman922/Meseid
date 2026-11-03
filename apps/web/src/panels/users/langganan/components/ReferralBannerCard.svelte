<script lang="ts">
	interface Props {
		referralCode?: string;
		onCopyCode?: () => void;
		onViewTerms?: () => void;
	}

	let {
		referralCode = 'MESEID-RINA-DEMO',
		onCopyCode,
		onViewTerms
	}: Props = $props();

	let isCopied = $state(false);

	function handleCopy() {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(referralCode);
		}
		isCopied = true;
		onCopyCode?.();
		setTimeout(() => {
			isCopied = false;
		}, 2500);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Ajak teman usaha
	</h2>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
		<!-- Left: Info -->
		<div class="space-y-1.5">
			<h3 class="text-xs sm:text-sm font-semibold text-[#111111]">
				Bagikan Meseid ke sesama pemilik usaha.
			</h3>
			<p class="text-xs text-[#6B7280] leading-relaxed">
				Bonus referral mengikuti syarat program yang berlaku. Lihat ketentuan sebelum mengundang; tidak ada nominal bonus yang dijanjikan di sini.
			</p>
		</div>

		<!-- Right: Referral Code & Actions -->
		<div class="space-y-2 md:text-left">
			<div class="space-y-0.5">
				<div class="font-mono text-sm sm:text-base font-semibold text-[#111111] tracking-wider">
					{referralCode}
				</div>
				<div class="text-xs text-[#6B7280]">
					Kode contoh · 0 undangan terkonfirmasi
				</div>
			</div>

			<div class="flex items-center gap-2 pt-1">
				<button
					type="button"
					onclick={handleCopy}
					class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
				>
					{isCopied ? 'Tersalin ✓' : 'Salin kode'}
				</button>
				<button
					type="button"
					onclick={onViewTerms}
					class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
				>
					Lihat ketentuan
				</button>
			</div>
		</div>
	</div>
</div>
