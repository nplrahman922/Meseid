<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import UserSidebar from '../../components/UserSidebar.svelte';
	import UserNavbar from '../../components/UserNavbar.svelte';
	import EmptyState501 from '../../components/EmptyState501.svelte';
	import BerandaRoot from './beranda/BerandaRoot.svelte';
	import KanalRoot from './kanal/KanalRoot.svelte';
	import KnowledgeBaseRoot from './knowledge-base/KnowledgeBaseRoot.svelte';
	import PersonaBotRoot from './persona-bot/PersonaBotRoot.svelte';
	import JamOperasionalRoot from './jam-operasional/JamOperasionalRoot.svelte';
	import KeuanganRoot from './keuangan/KeuanganRoot.svelte';
	import DokumenRoot from './dokumen/DokumenRoot.svelte';
	import JadwalRoot from './jadwal/JadwalRoot.svelte';
	import LanggananRoot from './langganan/LanggananRoot.svelte';
	import PengaturanRoot from './pengaturan/PengaturanRoot.svelte';
	import { authState, checkAuth, logoutUser, requireAuth } from '../../auth/authStore';
	import { formatUserDateTime } from '../../lib/dateTime';

	interface Props {
		businessName?: string;
		businessRole?: string;
		userName?: string;
		userRole?: string;
		onLogout?: () => void;
	}

	let {
		businessName: propBusinessName,
		businessRole = 'Owner · Pemilik usaha',
		userName: propUserName,
		userRole = 'Owner',
		onLogout
	}: Props = $props();

	let isAuthorized = $state(false);
	// Option 1: Navbar clock consistently reflects user's local device/browser timezone (e.g. WITA)
	let currentDateTime = $state(formatUserDateTime());
	let clockInterval: ReturnType<typeof setInterval> | undefined;

	onMount(async () => {
		// 1. Guard route: redirect if not logged in as owner
		const ok = await requireAuth('owner');
		if (ok) {
			isAuthorized = true;
		}

		// 2. Synchronize activeTab from URL search params if present
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const tabParam = params.get('tab');
			if (tabParam && tabLabels[tabParam]) {
				activeTab = tabParam;
			}
		}

		// 3. Real-time live clock ticking every second (auto-detects local browser timezone WITA/WIB/WIT)
		clockInterval = setInterval(() => {
			currentDateTime = formatUserDateTime();
		}, 1000);
	});

	onDestroy(() => {
		if (clockInterval) {
			clearInterval(clockInterval);
		}
	});

	let activeTab = $state('beranda');
	let isMobileSidebarOpen = $state(false);

	const tabLabels: Record<string, string> = {
		beranda: 'Beranda',
		kanal: 'Kanal',
		'knowledge-base': 'Knowledge Base',
		'persona-bot': 'Persona Bot',
		'jam-operasional': 'Jam Operasional',
		keuangan: 'Keuangan',
		dokumen: 'Dokumen',
		jadwal: 'Jadwal',
		langganan: 'Langganan',
		pengaturan: 'Pengaturan'
	};

	let currentLabel = $derived(tabLabels[activeTab] || 'Beranda');
	let breadcrumbText = $derived(`Owner · ${currentLabel}`);

	let computedBusinessName = $derived(
		propBusinessName || $authState.owner?.business_name || 'Bisnis Saya'
	);
	let computedUserName = $derived(
		propUserName || ($authState.user?.email ? $authState.user.email.split('@')[0] : 'Pemilik Usaha')
	);

	function handleSelectTab(id: string) {
		activeTab = id;
		if (typeof window !== 'undefined' && window.history.replaceState) {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', id);
			window.history.replaceState({}, '', url.toString());
		}
	}

	function toggleMobileSidebar() {
		isMobileSidebarOpen = !isMobileSidebarOpen;
	}

	function closeMobileSidebar() {
		isMobileSidebarOpen = false;
	}

	function handleHelpClick() {
		alert('Pusat Bantuan Meseid: Silakan hubungi support kami via email atau Telegram.');
	}

	async function handleLogout() {
		if (onLogout) {
			onLogout();
		} else {
			await logoutUser('/');
		}
	}
</script>

<svelte:head>
	<title>Meseid Dashboard — {currentLabel}</title>
</svelte:head>

{#if !isAuthorized}
	<!-- Minimalist loading state while verifying owner authentication -->
	<div class="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] text-[#0E6B2B]">
		<div class="flex flex-col items-center gap-4">
			<img src="/panel/logo_horizontal.svg" alt="Meseid" class="h-9 w-auto animate-pulse" />
			<div class="flex items-center gap-2 text-sm text-[#4B5563] font-inter">
				<svg class="w-4 h-4 animate-spin text-[#0E6B2B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				<span>Memverifikasi akses...</span>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen w-full flex bg-[#FAFAFA] text-[#111111]">
		<!-- Reusable Desktop & Mobile Sidebar -->
		<UserSidebar
			{activeTab}
			businessName={computedBusinessName}
			{businessRole}
			userName={computedUserName}
			{userRole}
			isOpen={isMobileSidebarOpen}
			onSelectTab={handleSelectTab}
			onClose={closeMobileSidebar}
			onLogout={handleLogout}
		/>

		<!-- Main Workspace Area -->
		<div class="flex-1 flex flex-col min-w-0 min-h-screen">
			<!-- Reusable Top Navbar -->
			<UserNavbar
				breadcrumb={breadcrumbText}
				dateText={currentDateTime}
				onToggleSidebar={toggleMobileSidebar}
				onHelpClick={handleHelpClick}
			/>

			<!-- Canvas / Page Content -->
			<main class="flex-1 p-4 sm:p-6 md:p-8 bg-[#FAFAFA] overflow-y-auto">
				{#if activeTab === 'beranda'}
					<BerandaRoot
						businessName={computedBusinessName}
						userName={computedUserName}
						role={userRole}
						dateText={currentDateTime}
						onNavigateTab={handleSelectTab}
					/>
				{:else if activeTab === 'kanal'}
					<KanalRoot
						businessName={computedBusinessName}
						userName={computedUserName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'knowledge-base'}
					<KnowledgeBaseRoot
						businessName={computedBusinessName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'persona-bot'}
					<PersonaBotRoot
						businessName={computedBusinessName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'jam-operasional'}
					<JamOperasionalRoot
						businessName={computedBusinessName}
						userName={computedUserName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'keuangan'}
					<KeuanganRoot
						businessName={computedBusinessName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'dokumen'}
					<DokumenRoot
						businessName={computedBusinessName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'jadwal'}
					<JadwalRoot
						businessName={computedBusinessName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'langganan'}
					<LanggananRoot
						businessName={computedBusinessName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else if activeTab === 'pengaturan'}
					<PengaturanRoot
						businessName={computedBusinessName}
						userName={computedUserName}
						role={userRole}
						dateText={currentDateTime}
					/>
				{:else}
					<div class="h-full min-h-[60vh] flex items-center justify-center">
						<EmptyState501
							title="Coming Soon"
							code="501"
						/>
					</div>
				{/if}
			</main>
		</div>
	</div>
{/if}

