<script lang="ts">
	import LanggananHeader from './components/LanggananHeader.svelte';
	import StatusAndToggleCard from './components/StatusAndToggleCard.svelte';
	import PaketPricingCards from './components/PaketPricingCards.svelte';
	import TokenUsageAndTopupCard from './components/TokenUsageAndTopupCard.svelte';
	import RiwayatPembayaranCard from './components/RiwayatPembayaranCard.svelte';
	import ReferralBannerCard from './components/ReferralBannerCard.svelte';
	import type { PaymentHistoryItem } from './langganan.types';

	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();

	let isYearlyBilling = $state(false);
	let toastMessage = $state('');

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	function handleToggleYearly(yearly: boolean) {
		isYearlyBilling = yearly;
		showToast(`Mode tagihan diubah ke ${yearly ? 'Tahunan (Hemat 2 bulan)' : 'Bulanan'}.`);
	}

	function handleSelectPro(interval: 'monthly' | 'yearly') {
		showToast(`Membuka checkout Midtrans untuk paket Pro (${interval === 'yearly' ? 'Tahunan Rp 490.000' : 'Bulanan Rp 49.000'})...`);
	}

	function handleTopup() {
		showToast('Membuka formulir top-up token Rp 20.000 via Midtrans...');
	}

	function handleViewReceipt(item: PaymentHistoryItem) {
		showToast(`Melihat tanda terima pembayaran ${item.orderNumber}...`);
	}

	function handleCopyReferral() {
		showToast('Kode referral berhasil disalin ke clipboard!');
	}

	function handleViewTerms() {
		showToast('Membuka syarat dan ketentuan program referral...');
	}
</script>

<div class="max-w-6xl mx-auto space-y-6 sm:space-y-8">
	<!-- 1. Header & Context Metadata -->
	<LanggananHeader {businessName} {role} {dateText} />

	<!-- 2. Status Paket Aktif & Switch Tagihan Tahunan -->
	<StatusAndToggleCard
		bind:isYearly={isYearlyBilling}
		onToggle={handleToggleYearly}
	/>

	<!-- 3. Perbandingan Paket Usaha (Gratis vs Pro) -->
	<PaketPricingCards
		isYearly={isYearlyBilling}
		onSelectPro={handleSelectPro}
	/>

	<!-- 4. Kuota Token & Tambah Token -->
	<TokenUsageAndTopupCard onTopup={handleTopup} />

	<!-- 5. Riwayat Pembayaran Midtrans -->
	<RiwayatPembayaranCard onViewReceipt={handleViewReceipt} />

	<!-- 6. Referral Card (Ajak Teman Usaha) -->
	<ReferralBannerCard
		onCopyCode={handleCopyReferral}
		onViewTerms={handleViewTerms}
	/>

	<!-- Floating Toast Feedback -->
	{#if toastMessage}
		<div class="fixed bottom-6 right-6 z-50 bg-[#111111] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 animate-fade-in font-mono">
			{toastMessage}
		</div>
	{/if}
</div>
