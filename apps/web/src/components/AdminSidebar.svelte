<script lang="ts">
	export interface AdminNavItem {
		id: string;
		label: string;
		icon: string;
	}

	interface Props {
		activeTab?: string;
		adminRoleTitle?: string;
		adminRoleSubtitle?: string;
		adminName?: string;
		adminInitials?: string;
		isOpen?: boolean;
		onSelectTab?: (id: string) => void;
		onClose?: () => void;
		onLogout?: () => void;
	}

	let {
		activeTab = 'ringkasan',
		adminRoleTitle = 'System Admin',
		adminRoleSubtitle = 'Operasional · metadata saja',
		adminName = 'Dewi · Admin Meseid',
		adminInitials = 'AD',
		isOpen = false,
		onSelectTab,
		onClose,
		onLogout
	}: Props = $props();

	const group1: AdminNavItem[] = [
		{ id: 'ringkasan', label: 'Ringkasan', icon: '/panel/ringkasan.svg' },
		{ id: 'daftar-owner', label: 'Daftar Owner', icon: '/panel/daftar-owner.svg' },
		{ id: 'token-biaya', label: 'Token & Biaya', icon: '/panel/token-biaya.svg' },
		{ id: 'kuota-paket', label: 'Kuota & Paket', icon: '/panel/kuota-paket.svg' },
		{ id: 'log-error', label: 'Log Error & Alert', icon: '/panel/log-err.svg' }
	];

	const group2: AdminNavItem[] = [
		{ id: 'penangguhan-akun', label: 'Penangguhan Akun', icon: '/panel/pengaturan.svg' }
	];

	function handleItemClick(id: string) {
		if (onSelectTab) {
			onSelectTab(id);
		}
		if (onClose) {
			onClose();
		}
	}
</script>

<!-- Desktop Sidebar: Floating Card Container (matching sidebar-admin.png & Default-dashboard-admin.png) -->
<aside
	class="hidden md:flex flex-col w-[270px] bg-white rounded-[24px] border border-[#E5E7EB] shadow-xs p-5 select-none shrink-0 self-start"
>
	<!-- Top Section: Logo + System Admin Badge + Nav Items -->
	<div class="space-y-4">
		<!-- Horizontal Logo Mark -->
		<a href="/dashboard-admin" class="block pt-0.5">
			<img
				src="/panel/logo_horizontal.svg"
				alt="Meseid"
				class="h-8.5 w-auto object-contain block"
			/>
		</a>

		<!-- System Admin Role Banner (bg #E8F9E6, rounded-xl, matching sidebar-admin.png) -->
		<div class="p-3.5 rounded-xl bg-[#E8F9E6] space-y-0.5">
			<div class="font-inter text-sm font-semibold text-[#111111]">
				{adminRoleTitle}
			</div>
			<div class="font-inter text-xs text-[#6B7280]">
				{adminRoleSubtitle}
			</div>
		</div>

		<!-- Nav Group 1 -->
		<nav class="space-y-1" aria-label="Main admin navigation">
			{#each group1 as item}
				<button
					type="button"
					onclick={() => handleItemClick(item.id)}
					class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-all duration-150 cursor-pointer {activeTab ===
					item.id
						? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
						: 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#0E6B2B]'}"
				>
					<span class="w-5 h-5 flex items-center justify-center shrink-0">
						<img
							src={item.icon}
							alt=""
							class="w-4.5 h-4.5 object-contain transition-all"
							style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.8);'}
						/>
					</span>
					<span>{item.label}</span>
				</button>
			{/each}
		</nav>

		<!-- Subtle Divider Line (Single soft 1px line matching sidebar-admin.png) -->
		<div class="pt-0.5">
			<div class="my-2" style="border-top: 1px solid #ECEEEF;"></div>

			<!-- Nav Group 2: Penangguhan Akun -->
			<nav class="space-y-1" aria-label="Secondary admin navigation">
				{#each group2 as item}
					<button
						type="button"
						onclick={() => handleItemClick(item.id)}
						class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-all duration-150 cursor-pointer {activeTab ===
						item.id
							? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
							: 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#0E6B2B]'}"
					>
						<span class="w-5 h-5 flex items-center justify-center shrink-0">
							<img
								src={item.icon}
								alt=""
								class="w-4.5 h-4.5 object-contain transition-all"
								style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.8);'}
							/>
						</span>
						<span>{item.label}</span>
					</button>
				{/each}
			</nav>
		</div>

		<!-- Bottom Section: Admin Avatar + Name + Logout (Clean spacing, NO harsh border line, seamless pastel avatar) -->
		<div class="pt-4 pb-1 flex items-center gap-3">
			<!-- Soft Green Initial Avatar 'AD' (clean pastel background, no harsh border) -->
			<div
				class="w-9 h-9 rounded-full bg-[#E8F9E6] text-[#0E6B2B] font-inter font-bold text-xs flex items-center justify-center shrink-0"
			>
				{adminInitials}
			</div>

			<!-- Admin Info & Logout Action -->
			<div class="min-w-0 flex-1 space-y-0.5">
				<div class="font-inter text-xs font-semibold text-[#111111] leading-tight truncate">
					{adminName}
				</div>
				<button
					type="button"
					onclick={onLogout}
					class="font-inter text-[11px] text-[#6B7280] hover:text-[#EF4444] transition-colors block text-left cursor-pointer focus:outline-hidden"
				>
					Keluar dari akun
				</button>
			</div>
		</div>
	</div>
</aside>

<!-- Mobile Drawer Sidebar (When isOpen is true on mobile screens) -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 md:hidden flex"
		role="dialog"
		aria-modal="true"
		aria-labelledby="mobile-admin-sidebar-title"
	>
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-200"
			onclick={onClose}
			aria-label="Close menu backdrop"
		></button>

		<!-- Drawer Container -->
		<div
			class="relative w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between p-6 z-10 overflow-y-auto animate-in slide-in-from-left duration-200"
		>
			<div class="space-y-6">
				<!-- Header with Logo and Close 'X' -->
				<div class="flex items-center justify-between">
					<img
						src="/panel/logo_horizontal.svg"
						alt="Meseid"
						class="h-8 w-auto object-contain block"
					/>
					<button
						type="button"
						onclick={onClose}
						class="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-neutral-100"
						aria-label="Close sidebar"
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- System Admin Role Banner -->
				<div class="p-3.5 rounded-xl bg-[#E8F9E6] space-y-0.5">
					<div class="font-inter text-sm font-semibold text-[#111111]">
						{adminRoleTitle}
					</div>
					<div class="font-inter text-xs text-[#6B7280]">
						{adminRoleSubtitle}
					</div>
				</div>

				<!-- Mobile Nav Group 1 -->
				<nav class="space-y-1">
					{#each group1 as item}
						<button
							type="button"
							onclick={() => handleItemClick(item.id)}
							class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-colors {activeTab ===
							item.id
								? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
								: 'text-[#4B5563] hover:bg-[#F3F4F6]'}"
						>
							<span class="w-5 h-5 flex items-center justify-center shrink-0">
								<img
									src={item.icon}
									alt=""
									class="w-4.5 h-4.5 object-contain"
									style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.8);'}
								/>
							</span>
							<span>{item.label}</span>
						</button>
					{/each}
				</nav>

				<!-- Mobile Nav Group 2 -->
				<div class="pt-0.5">
					<div class="my-2" style="border-top: 1px solid #ECEEEF;"></div>
					<nav class="space-y-1">
						{#each group2 as item}
							<button
								type="button"
								onclick={() => handleItemClick(item.id)}
								class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-colors {activeTab ===
								item.id
									? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
									: 'text-[#4B5563] hover:bg-[#F3F4F6]'}"
							>
								<span class="w-5 h-5 flex items-center justify-center shrink-0">
									<img
										src={item.icon}
										alt=""
										class="w-4.5 h-4.5 object-contain"
										style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.8);'}
									/>
								</span>
								<span>{item.label}</span>
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Mobile Bottom User Profile & Logout -->
			<div class="pt-4 flex items-center gap-3">
				<div
					class="w-9 h-9 rounded-full bg-[#E8F9E6] text-[#0E6B2B] font-inter font-bold text-xs flex items-center justify-center shrink-0"
				>
					{adminInitials}
				</div>
				<div class="min-w-0 flex-1 space-y-0.5">
					<div class="font-inter text-xs font-semibold text-[#111111] truncate">
						{adminName}
					</div>
					<button
						type="button"
						onclick={onLogout}
						class="font-inter text-[11px] text-[#6B7280] hover:text-[#EF4444] transition-colors block text-left cursor-pointer"
					>
						Keluar dari akun
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
