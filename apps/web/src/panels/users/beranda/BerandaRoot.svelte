<script lang="ts">
	import BerandaHeader from './components/BerandaHeader.svelte';
	import MetricsCardsGrid from './components/MetricsCardsGrid.svelte';
	import ChannelSummaryGrid from './components/ChannelSummaryGrid.svelte';
	import WeeklyFinanceCard from './components/WeeklyFinanceCard.svelte';
	import RecentActivityCard from './components/RecentActivityCard.svelte';
	import UpcomingSchedulesCard from './components/UpcomingSchedulesCard.svelte';

	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
		onNavigateTab?: (tabId: string) => void;
	}

	let {
		businessName = 'Warung Bu Rina',
		userName = 'Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB',
		onNavigateTab
	}: Props = $props();

	function handleNavigate(tabId: string) {
		if (onNavigateTab) {
			onNavigateTab(tabId);
		}
	}
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- 1. Header with Greeting and Decorative Slider Line -->
	<BerandaHeader
		{businessName}
		{userName}
		{role}
		{dateText}
	/>

	<!-- 2. Four Metrics Cards Grid (Transaksi, Kas, Pesan, Token) -->
	<MetricsCardsGrid />

	<!-- 3. Three Channel Summary Mini Cards (WhatsApp, Telegram, Google) -->
	<ChannelSummaryGrid />

	<!-- 4. Two-Column Middle Section: Laporan Minggu Ini & Aktivitas Terbaru -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<WeeklyFinanceCard onViewFinance={() => handleNavigate('keuangan')} />
		<RecentActivityCard />
	</div>

	<!-- 5. Bottom Section: Jadwal Mendatang & Conflict Warning -->
	<UpcomingSchedulesCard onOpenSchedules={() => handleNavigate('jadwal')} />
</div>
