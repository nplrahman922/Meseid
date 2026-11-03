<script lang="ts">
	import KeuanganHeader from './components/KeuanganHeader.svelte';
	import KeuanganNavTabs from './components/KeuanganNavTabs.svelte';
	import KeuanganActionBar from './components/KeuanganActionBar.svelte';
	import JurnalUmumCard from './components/JurnalUmumCard.svelte';
	import BukuBesarCard from './components/BukuBesarCard.svelte';
	import NeracaSaldoCard from './components/NeracaSaldoCard.svelte';
	import BukuKasCard from './components/BukuKasCard.svelte';
	import SubledgerUtangPiutangCard from './components/SubledgerUtangPiutangCard.svelte';
	import type { FinancialReportTab } from './keuangan.types';

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

	let activeReportTab = $state<FinancialReportTab>('jurnal');

	function handleAddTransaction() {
		alert('Fitur Tambah Transaksi: Anda dapat mencatat pemasukan atau pengeluaran baru secara manual.');
	}

	function handleExportExcel() {
		alert('Fitur Export Excel: Laporan Jurnal Umum dan Buku Kas akan diunduh dalam format .xlsx.');
	}

	function handleViewDetail(refCode: string) {
		alert(`Detail Transaksi ${refCode}: Sumber transaksi berasal dari struk pembelanjaan (OCR).`);
	}
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- 1. Header with Breadcrumb & Divider Slider -->
	<KeuanganHeader
		{businessName}
		{role}
		{dateText}
	/>

	<!-- 2. Financial Nav Tabs (5 Report Sub-tabs) -->
	<KeuanganNavTabs
		activeTab={activeReportTab}
		onSelectTab={(tab) => (activeReportTab = tab)}
	/>

	<!-- 3. Action Bar: Filter Period, Tambah Transaksi, Export Excel -->
	<KeuanganActionBar
		onAddTransaction={handleAddTransaction}
		onExportExcel={handleExportExcel}
	/>

	<!-- 4. Reports View Display -->
	{#if activeReportTab === 'jurnal'}
		<!-- Main Journal Card -->
		<JurnalUmumCard onViewDetail={handleViewDetail} />

		<!-- Specimen Preview Banner -->
		<div
			class="w-full px-4 py-3 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-[#0E6B2B] text-xs font-intel leading-relaxed"
		>
			Pratinjau laporan di bawah · Ringkasan otomatis untuk membantu membaca buku. Tampilan utama tetap Jurnal Umum.
		</div>

		<!-- 2-Column: General Ledger & Trial Balance -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
			<BukuBesarCard />
			<NeracaSaldoCard />
		</div>

		<!-- Cash Flow Card -->
		<BukuKasCard />

		<!-- Subledger Debt/Receivables Card -->
		<SubledgerUtangPiutangCard />
	{:else if activeReportTab === 'buku-besar'}
		<BukuBesarCard />
	{:else if activeReportTab === 'neraca'}
		<NeracaSaldoCard />
	{:else if activeReportTab === 'buku-kas'}
		<BukuKasCard />
	{:else if activeReportTab === 'utang-piutang'}
		<SubledgerUtangPiutangCard />
	{/if}
</div>
