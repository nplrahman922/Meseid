<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import AdminNavbar from '../../components/AdminNavbar.svelte';
	import AdminSidebar from '../../components/AdminSidebar.svelte';
	import EmptyState501 from '../../components/EmptyState501.svelte';
	import { authState, checkAuth, logoutUser, requireAuth } from '../../auth/authStore';
	import { formatAdminDateTime } from '../../lib/dateTime';

	interface Props {
		adminName?: string;
		adminRoleTitle?: string;
		adminRoleSubtitle?: string;
		adminInitials?: string;
		onLogout?: () => void;
	}

	let {
		adminName: propAdminName,
		adminRoleTitle = 'System Admin',
		adminRoleSubtitle = 'Operasional · metadata saja',
		adminInitials: propAdminInitials,
		onLogout
	}: Props = $props();

	let isAuthorized = $state(false);
	let currentDateTime = $state(formatAdminDateTime());
	let clockInterval: ReturnType<typeof setInterval> | undefined;

	onMount(async () => {
		// 1. Guard route: redirect if not logged in as admin
		const ok = await requireAuth('admin');
		if (ok) {
			isAuthorized = true;
		}

		// 2. Real-time live clock ticking every second
		clockInterval = setInterval(() => {
			currentDateTime = formatAdminDateTime();
		}, 1000);
	});

	onDestroy(() => {
		if (clockInterval) {
			clearInterval(clockInterval);
		}
	});

	let activeTab = $state('ringkasan');
	let isMobileSidebarOpen = $state(false);

	const tabLabels: Record<string, string> = {
		ringkasan: 'Ringkasan',
		'daftar-owner': 'Daftar Owner',
		'token-biaya': 'Token & Biaya',
		'kuota-paket': 'Kuota & Paket',
		'log-error': 'Log Error & Alert',
		'penangguhan-akun': 'Penangguhan Akun'
	};

	let currentLabel = $derived(tabLabels[activeTab] || 'Ringkasan');

	// Dynamic admin info from authenticated user session
	let currentEmail = $derived($authState.user?.email);
	let displayName = $derived(
		propAdminName || (currentEmail ? currentEmail.split('@')[0] : 'Dewi')
	);
	let navbarAdminLabel = $derived(`System Admin · ${displayName}`);
	let sidebarAdminLabel = $derived(`${displayName} · Admin Meseid`);
	let computedInitials = $derived(
		propAdminInitials || (displayName ? displayName.slice(0, 2).toUpperCase() : 'AD')
	);

	function handleSelectTab(id: string) {
		activeTab = id;
	}

	function toggleMobileSidebar() {
		isMobileSidebarOpen = !isMobileSidebarOpen;
	}

	function closeMobileSidebar() {
		isMobileSidebarOpen = false;
	}

	function handleRefresh() {
		currentDateTime = formatAdminDateTime();
		checkAuth();
	}

	function handleHelpClick() {
		alert('Pusat Bantuan Admin Meseid: Dokumentasi operasional dan pelaporan kendala.');
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
	<title>Meseid Admin — {currentLabel}</title>
</svelte:head>

{#if !isAuthorized}
	<!-- Minimalist loading state while verifying admin authentication -->
	<div class="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] text-[#0E6B2B]">
		<div class="flex flex-col items-center gap-4">
			<img src="/panel/logo_horizontal.svg" alt="Meseid" class="h-9 w-auto animate-pulse" />
			<div class="flex items-center gap-2 text-sm text-[#4B5563] font-inter">
				<svg class="w-4 h-4 animate-spin text-[#0E6B2B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				<span>Memverifikasi akses admin...</span>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen w-full flex flex-col bg-[#FAFAFA] text-[#111111] antialiased">
		<!-- Full Width Admin Top Navbar (#0E6B2B green background matching Default-dashboard-admin.png) -->
		<AdminNavbar
			adminName={navbarAdminLabel}
			dateText={currentDateTime}
			onRefresh={handleRefresh}
			onHelpClick={handleHelpClick}
			onToggleSidebar={toggleMobileSidebar}
		/>

		<!-- Body Workspace Container (Full width, padding aligned with AdminNavbar) -->
		<div class="flex-1 w-full flex flex-col md:flex-row items-center md:items-start px-4 sm:px-6 md:px-8 py-6 gap-6 md:gap-10 min-w-0">
			<!-- Floating Admin Sidebar Card -->
			<AdminSidebar
				{activeTab}
				{adminRoleTitle}
				{adminRoleSubtitle}
				adminName={sidebarAdminLabel}
				adminInitials={computedInitials}
				isOpen={isMobileSidebarOpen}
				onSelectTab={handleSelectTab}
				onClose={closeMobileSidebar}
				onLogout={handleLogout}
			/>

			<!-- Central Canvas Area with 501 Coming Soon State -->
			<main class="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 min-h-[calc(100vh-140px)]">
				<EmptyState501
					title="Coming Soon"
					code="501"
				/>
			</main>
		</div>
	</div>
{/if}

