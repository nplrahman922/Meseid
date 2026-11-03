<script lang="ts">
	import PengaturanHeader from './components/PengaturanHeader.svelte';
	import ProfilOwnerCard from './components/ProfilOwnerCard.svelte';
	import ProfilUsahaCard from './components/ProfilUsahaCard.svelte';
	import PrivasiChatCard from './components/PrivasiChatCard.svelte';
	import EksporDataCard from './components/EksporDataCard.svelte';
	import HapusDataUuPdpCard from './components/HapusDataUuPdpCard.svelte';
	import type { OwnerProfile, BusinessProfile } from './pengaturan.types';

	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		userName = 'Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();

	let toastMessage = $state('');

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3500);
	}

	function handleSaveOwner(data: OwnerProfile) {
		showToast(`Profil ${data.ownerName} berhasil diperbarui!`);
	}

	function handleSaveBusiness(data: BusinessProfile) {
		showToast(`Informasi usaha ${data.businessName} berhasil diperbarui!`);
	}

	function handleOpenPrivacyPolicy() {
		showToast('Membuka dokumen Kebijakan Privasi Meseid...');
	}

	function handleExportRequest() {
		showToast('Permintaan ekspor data diterima. File arsip sedang diproses...');
	}

	function handleConfirmErasure() {
		showToast('Memanggil prosedur kanonikal delete_owner_data() sesuai UU PDP...');
	}
</script>

<div class="max-w-6xl mx-auto space-y-6 sm:space-y-8">
	<!-- 1. Header & Title -->
	<PengaturanHeader {businessName} {role} {dateText} />

	<!-- 2. Profil Owner & Usaha (2 Columns) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<ProfilOwnerCard
			initialData={{
				ownerName: userName,
				email: 'rina@contoh.invalid',
				role: `${role} · Pemilik usaha`
			}}
			onSave={handleSaveOwner}
		/>
		<ProfilUsahaCard
			initialData={{
				businessName,
				businessType: 'Warung makan & minuman',
				address: 'Jl. Melati No. 12, Bandung (contoh)',
				timezone: 'Asia/Jakarta - WIB'
			}}
			onSave={handleSaveBusiness}
		/>
	</div>

	<!-- 3. Privasi Percakapan -->
	<PrivasiChatCard onOpenPolicy={handleOpenPrivacyPolicy} />

	<!-- 4. Minta Ekspor Data (Portabilitas UU PDP) -->
	<EksporDataCard onRequestExport={handleExportRequest} />

	<!-- 5. Hapus Data Saya (UU PDP No. 27/2022) -->
	<HapusDataUuPdpCard
		{businessName}
		onConfirmErasure={handleConfirmErasure}
	/>

	<!-- Floating Toast Feedback -->
	{#if toastMessage}
		<div class="fixed bottom-6 right-6 z-50 bg-[#111111] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 animate-fade-in font-mono">
			{toastMessage}
		</div>
	{/if}
</div>
