<script lang="ts">
	interface Props {
		isYearly?: boolean;
		onToggle?: (yearly: boolean) => void;
	}

	let { isYearly = $bindable(false), onToggle }: Props = $props();

	function handleSwitch() {
		isYearly = !isYearly;
		onToggle?.(isYearly);
	}
</script>

<div class="space-y-4">
	<!-- Active Plan Badge Callout -->
	<div class="flex flex-wrap items-center gap-2 text-xs font-mono text-[#374151]">
		<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D1D5DB] font-medium text-[#111111]">
			<span class="w-2 h-2 rounded-full bg-[#16A34A]"></span>
			Paket saat ini · Gratis
		</span>
		<span class="text-[#6B7280]">
			Belum ada langganan Pro aktif pada contoh utama ini.
		</span>
	</div>

	<!-- Annual Billing Switch Card -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 space-y-3">
		<div class="flex items-center gap-3">
			<button
				type="button"
				role="switch"
				aria-checked={isYearly}
				aria-label="Alihkan tagihan tahunan"
				onclick={handleSwitch}
				class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {isYearly
					? 'bg-[#16A34A]'
					: 'bg-gray-300'}"
			>
				<span
					class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {isYearly
						? 'translate-x-5'
						: 'translate-x-0'}"
				></span>
			</button>

			<div class="flex flex-col">
				<span class="text-xs font-semibold text-[#111111]">Tagihan tahunan</span>
				<span class="text-xs text-[#6B7280]">{isYearly ? 'Aktif' : 'Nonaktif'}</span>
			</div>
		</div>

		<p class="text-xs text-[#6B7280] font-mono">
			{#if isYearly}
				Pilihan saat ini: tahunan · Tahunan: Pro Rp 490.000/tahun (setara Rp 40.833/bln, hemat Rp 98.000).
			{:else}
				Pilihan saat ini: bulanan · Tahunan: Pro Rp 490.000/tahun.
			{/if}
		</p>
	</div>
</div>
