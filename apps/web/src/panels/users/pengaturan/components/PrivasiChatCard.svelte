<script lang="ts">
	interface Props {
		onOpenPolicy?: () => void;
	}

	let { onOpenPolicy }: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Privasi percakapan
	</h2>

	<div class="space-y-2">
		<h3 class="text-lg sm:text-xl font-intel font-normal text-[#111111] tracking-wide">
			Chat Anda tetap milik Anda.
		</h3>
		<p class="text-xs sm:text-sm text-[#4B5563] leading-relaxed font-sans">
			Admin tidak dapat membaca chat Anda. Admin hanya melihat status koneksi, penggunaan layanan, dan langganan untuk membantu operasional.
		</p>
		<p class="text-xs text-[#6B7280]">
			Pernyataan privasi produk Meseid · Tinjau Kebijakan Privasi untuk penjelasan pemrosesan, penyimpanan, dan hak data Anda.
		</p>
	</div>

	<div class="pt-1">
		<button
			type="button"
			onclick={onOpenPolicy}
			class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
		>
			Baca Kebijakan Privasi
		</button>
	</div>
</div>
