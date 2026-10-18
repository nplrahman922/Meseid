<script lang="ts">
	export interface NavItem {
		id: string;
		label: string;
		icon: string;
		badge?: string;
	}

	interface Props {
		activeTab?: string;
		businessName?: string;
		businessRole?: string;
		userName?: string;
		userRole?: string;
		isOpen?: boolean;
		onSelectTab?: (id: string) => void;
		onClose?: () => void;
		onLogout?: () => void;
	}

	let {
		activeTab = 'beranda',
		businessName = 'Warung Bu Rina',
		businessRole = 'Owner · Pemilik usaha',
		userName = 'Bu Rina',
		userRole = 'Owner',
		isOpen = false,
		onSelectTab,
		onClose,
		onLogout
	}: Props = $props();

	const group1: NavItem[] = [
		{ id: 'beranda', label: 'Beranda', icon: '/panel/dokumen.svg' },
		{ id: 'kanal', label: 'Kanal', icon: '/panel/kanal.svg' },
		{ id: 'knowledge-base', label: 'Knowledge Base', icon: '/panel/knowlede-base.svg' },
		{ id: 'persona-bot', label: 'Persona Bot', icon: '/panel/persona-bot.svg' },
		{ id: 'jam-operasional', label: 'Jam Operasional', icon: '/panel/jam-operasional.svg' },
		{ id: 'keuangan', label: 'Keuangan', icon: '/panel/keuangan.svg' }
	];

	const group2: NavItem[] = [
		{ id: 'dokumen', label: 'Dokumen', icon: '/panel/dokumen.svg' },
		{ id: 'jadwal', label: 'Jadwal', icon: '/panel/jam-operasional.svg' },
		{ id: 'langganan', label: 'Langganan', icon: '/panel/langganan.svg' },
		{ id: 'pengaturan', label: 'Pengaturan', icon: '/panel/pengaturan.svg' }
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

<!-- Desktop Sidebar (Fixed left) -->
<aside
	class="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-[#E5E7EB] px-5 py-6 justify-between select-none shrink-0"
>
	<!-- Top Section: Brand + Business Card + Navigation -->
	<div class="space-y-6">
		<!-- Horizontal Logo (Tinggi mark 40px sesuai panduan fondasi merek) -->
		<a href="/dashboard" class="block">
			<img
				src="/panel/logo_horizontal.svg"
				alt="Meseid"
				class="h-9 w-auto object-contain block"
			/>
		</a>

		<!-- Business Owner Card (Matching sidebar-users.png: bg #E8F9E6, rounded 12px) -->
		<div class="p-3.5 rounded-xl bg-[#E8F9E6] space-y-0.5">
			<div class="font-inter text-sm font-semibold text-[#111111]">
				{businessName}
			</div>
			<div class="font-inter text-xs text-[#6B7280]">
				{businessRole}
			</div>
		</div>

		<!-- Nav Group 1 -->
		<nav class="space-y-1" aria-label="Main navigation">
			{#each group1 as item}
				<button
					type="button"
					onclick={() => handleItemClick(item.id)}
					class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-all duration-150 cursor-pointer {activeTab ===
					item.id
						? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
						: 'text-[#111111] hover:bg-[#F3F4F6] hover:text-[#0E6B2B]'}"
				>
					<span class="w-5 h-5 flex items-center justify-center shrink-0">
						<img
							src={item.icon}
							alt=""
							class="w-4.5 h-4.5 object-contain"
							style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.85);'}
						/>
					</span>
					<span>{item.label}</span>
				</button>
			{/each}
		</nav>

		<!-- Divider Gap between groups -->
		<div class="pt-2">
			<!-- Nav Group 2 -->
			<nav class="space-y-1" aria-label="Secondary navigation">
				{#each group2 as item}
					<button
						type="button"
						onclick={() => handleItemClick(item.id)}
						class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-all duration-150 cursor-pointer {activeTab ===
						item.id
							? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
							: 'text-[#111111] hover:bg-[#F3F4F6] hover:text-[#0E6B2B]'}"
					>
						<span class="w-5 h-5 flex items-center justify-center shrink-0">
							<img
								src={item.icon}
								alt=""
								class="w-4.5 h-4.5 object-contain"
								style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.85);'}
							/>
						</span>
						<span>{item.label}</span>
					</button>
				{/each}
			</nav>
		</div>
	</div>

	<!-- Bottom Section: User Info + Logout -->
	<div class="pt-6 border-t border-[#E5E7EB]/60 space-y-1">
		<div class="font-inter text-xs text-[#6B7280]">
			{userName} · {userRole}
		</div>
		<button
			type="button"
			onclick={onLogout}
			class="font-inter text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors flex items-center gap-1 cursor-pointer focus:outline-hidden"
		>
			<span>Keluar dari akun</span>
			<span>↗</span>
		</button>
	</div>
</aside>

<!-- Mobile Drawer Sidebar (When isOpen is true) -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 md:hidden flex"
		role="dialog"
		aria-modal="true"
		aria-labelledby="mobile-sidebar-title"
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

				<!-- Business Card -->
				<div class="p-3.5 rounded-xl bg-[#E8F9E6] space-y-0.5">
					<div class="font-inter text-sm font-semibold text-[#111111]">
						{businessName}
					</div>
					<div class="font-inter text-xs text-[#6B7280]">
						{businessRole}
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
								: 'text-[#111111] hover:bg-[#F3F4F6]'}"
						>
							<span class="w-5 h-5 flex items-center justify-center shrink-0">
								<img
									src={item.icon}
									alt=""
									class="w-4.5 h-4.5 object-contain"
									style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.85);'}
								/>
							</span>
							<span>{item.label}</span>
						</button>
					{/each}
				</nav>

				<!-- Mobile Nav Group 2 -->
				<div class="pt-2">
					<nav class="space-y-1">
						{#each group2 as item}
							<button
								type="button"
								onclick={() => handleItemClick(item.id)}
								class="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-inter transition-colors {activeTab ===
								item.id
									? 'bg-[#E8F9E6] text-[#0E6B2B] font-semibold'
									: 'text-[#111111] hover:bg-[#F3F4F6]'}"
							>
								<span class="w-5 h-5 flex items-center justify-center shrink-0">
									<img
										src={item.icon}
										alt=""
										class="w-4.5 h-4.5 object-contain"
										style={activeTab === item.id ? '' : 'filter: grayscale(1) opacity(0.85);'}
									/>
								</span>
								<span>{item.label}</span>
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Mobile Bottom Logout -->
			<div class="pt-6 border-t border-[#E5E7EB] space-y-1">
				<div class="font-inter text-xs text-[#6B7280]">
					{userName} · {userRole}
				</div>
				<button
					type="button"
					onclick={onLogout}
					class="font-inter text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors flex items-center gap-1"
				>
					<span>Keluar dari akun</span>
					<span>↗</span>
				</button>
			</div>
		</div>
	</div>
{/if}
