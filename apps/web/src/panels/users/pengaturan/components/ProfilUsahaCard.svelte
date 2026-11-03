<script lang="ts">
	import type { BusinessProfile } from '../pengaturan.types';

	interface Props {
		initialData?: BusinessProfile;
		onSave?: (data: BusinessProfile) => void;
	}

	let {
		initialData = {
			businessName: 'Warung Bu Rina',
			businessType: 'Warung makan & minuman',
			address: 'Jl. Melati No. 12, Bandung (contoh)',
			timezone: 'Asia/Jakarta - WIB'
		},
		onSave
	}: Props = $props();

	let businessName = $state('');
	let businessType = $state('');
	let address = $state('');
	let timezone = $state('');
	let isSaved = $state(false);

	$effect(() => {
		businessName = initialData.businessName;
		businessType = initialData.businessType;
		address = initialData.address;
		timezone = initialData.timezone;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onSave?.({ businessName, businessType, address, timezone });
		isSaved = true;
		setTimeout(() => {
			isSaved = false;
		}, 3000);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Profil usaha
	</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<!-- Nama Usaha -->
		<div class="space-y-1.5">
			<label for="business-name" class="block text-xs font-semibold text-[#111111]">
				Nama usaha
			</label>
			<input
				id="business-name"
				type="text"
				bind:value={businessName}
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
			/>
		</div>

		<!-- Jenis Usaha -->
		<div class="space-y-1.5">
			<label for="business-type" class="block text-xs font-semibold text-[#111111]">
				Jenis usaha
			</label>
			<input
				id="business-type"
				type="text"
				bind:value={businessType}
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
			/>
		</div>

		<!-- Alamat Usaha -->
		<div class="space-y-1.5">
			<label for="business-address" class="block text-xs font-semibold text-[#111111]">
				Alamat usaha
			</label>
			<input
				id="business-address"
				type="text"
				bind:value={address}
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
			/>
		</div>

		<!-- Zona Waktu -->
		<div class="space-y-1.5">
			<label for="business-timezone" class="block text-xs font-semibold text-[#111111]">
				Zona waktu
			</label>
			<input
				id="business-timezone"
				type="text"
				bind:value={timezone}
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
			/>
		</div>

		<!-- Action Button -->
		<div class="pt-2 flex items-center gap-3">
			<button
				type="submit"
				class="px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer"
			>
				Simpan usaha
			</button>
			{#if isSaved}
				<span class="text-xs font-medium text-[#16A34A]">✓ Tersimpan</span>
			{/if}
		</div>
	</form>
</div>
