<script lang="ts">
	import { onMount } from 'svelte';
	import type { AccessRuleItem } from '../kanal.types';
	import AccessRulesFilterBar from './AccessRulesFilterBar.svelte';
	import AccessRulesTableRow from './AccessRulesTableRow.svelte';

	interface Props {
		isOpenForAll?: boolean;
	}

	let { isOpenForAll: propIsOpenForAll }: Props = $props();

	let isOpenForAll = $state(true);
	$effect(() => {
		if (propIsOpenForAll !== undefined) {
			isOpenForAll = propIsOpenForAll;
		}
	});
	let rules = $state<AccessRuleItem[]>([]);
	let activeChannel = $state<'all' | 'whatsapp' | 'telegram'>('all');
	let activeCategory = $state<'all' | 'group' | 'number' | 'blocked'>('all');
	let searchQuery = $state('');
	let analyzingTargetId = $state<string | null>(null);

	let filteredRules = $derived(
		rules.filter((item) => {
			if (activeChannel !== 'all' && item.channel !== activeChannel) return false;
			if (activeCategory === 'group' && item.target_type !== 'group') return false;
			if (activeCategory === 'number' && item.target_type !== 'number') return false;
			if (activeCategory === 'blocked' && item.status !== 'blocked') return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				return (
					item.target_name.toLowerCase().includes(q) ||
					(item.custom_label && item.custom_label.toLowerCase().includes(q)) ||
					item.target_id.toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	async function loadRulesFromApi() {
		try {
			const res = await fetch('/api/owner/kanal/access-rules', {
				headers: { Accept: 'application/json' },
				credentials: 'include'
			});
			if (res.ok) {
				const json = await res.json();
				const data = json.data;
				if (data) {
					isOpenForAll = data.global_access_mode === 'open';
					if (Array.isArray(data.rules)) {
						rules = data.rules.map((r: any) => ({ ...r, isSelected: false }));
					}
				}
			}
		} catch {
			// Fallback
		}
	}

	async function toggleGlobalAccess() {
		const newMode = isOpenForAll ? 'whitelist' : 'open';
		isOpenForAll = !isOpenForAll;
		try {
			await fetch('/api/owner/kanal/global-access', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ mode: newMode })
			});
		} catch {
			isOpenForAll = !isOpenForAll;
		}
	}

	async function toggleBlockStatus(item: AccessRuleItem) {
		if (item.is_owner) return;
		const previousStatus = item.status;
		const newStatus = item.status === 'blocked' ? 'active' : 'blocked';
		item.status = newStatus;
		try {
			const res = await fetch('/api/owner/kanal/access-rules', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					channel: item.channel,
					target_type: item.target_type,
					target_id: item.target_id,
					status: newStatus
				})
			});
			if (!res.ok) {
				item.status = previousStatus;
			}
		} catch {
			item.status = previousStatus;
		}
	}

	async function updateGroupPersona(item: AccessRuleItem, newPersona: 'assistant' | 'admin') {
		item.persona_mode = newPersona;
		try {
			await fetch('/api/owner/kanal/access-rules', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					channel: item.channel,
					target_type: item.target_type,
					target_id: item.target_id,
					persona_mode: newPersona
				})
			});
		} catch {
			// Error
		}
	}

	async function refreshBehavior(item: AccessRuleItem) {
		analyzingTargetId = item.target_id;
		try {
			const res = await fetch('/api/owner/kanal/analyze-behavior', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					channel: item.channel,
					target_id: item.target_id,
					target_type: item.target_type
				})
			});
			if (res.ok) {
				const json = await res.json();
				const result = json.data || json;
				if (result?.behavior_summary) {
					item.behavior_summary = result.behavior_summary;
					item.behavior_analyzed_at = result.behavior_analyzed_at;
				}
			}
		} catch {
			// Error
		} finally {
			analyzingTargetId = null;
		}
	}

	function toggleSelect(id: string) {
		rules = rules.map((r) => (r.id === id ? { ...r, isSelected: !r.isSelected } : r));
	}

	onMount(() => {
		loadRulesFromApi();
	});
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs font-intel">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div>
			<h2 class="text-base sm:text-lg font-medium text-[#111111]">
				Hak Akses Grup &amp; Daftar Nomor
			</h2>
			<p class="text-xs text-[#6B7280] mt-0.5">
				Kelola izin interaksi bot, pemblokiran spam, dan peran Asisten vs Admin Toko di WhatsApp &amp; Telegram.
			</p>
		</div>
		<button
			type="button"
			onclick={loadRulesFromApi}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors self-start sm:self-auto"
		>
			<svg class="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
			<span>Sinkron Data</span>
		</button>
	</div>

	<!-- Global Access Mode Toggle Box -->
	<div class="flex items-center gap-3 p-3 bg-gray-50/70 rounded-xl border border-gray-200">
		<button
			type="button"
			aria-label="Toggle Terbuka Untuk Semua Nomor"
			onclick={toggleGlobalAccess}
			class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {isOpenForAll ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
		>
			<span
				class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {isOpenForAll ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
			></span>
		</button>
		<div>
			<div class="text-xs sm:text-sm font-medium text-[#111111]">
				Terbuka Untuk Semua Nomor &amp; Pengguna
			</div>
			<div class="text-[11px] {isOpenForAll ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
				{isOpenForAll ? 'Aktif (Tamu umum dapat chat toko, kecuali yang diblokir)' : 'Nonaktif (Hanya nomor aktif yang dilayani)'}
			</div>
		</div>
	</div>

	<!-- Filter Bar Subcomponent -->
	<AccessRulesFilterBar
		{activeChannel}
		{activeCategory}
		bind:searchQuery
		onSelectChannel={(c) => (activeChannel = c)}
		onSelectCategory={(cat) => (activeCategory = cat)}
	/>

	<!-- Table -->
	<div class="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
		<div class="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA] text-xs">
			<span class="font-medium text-[#111111]">
				Daftar Nomor &amp; Grup Terdaftar
			</span>
			<span class="text-[#6B7280]">
				{filteredRules.length} data ditemukan
			</span>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="text-[#6B7280] border-b border-[#E5E7EB] bg-white">
					<tr>
						<th class="py-2.5 px-4 font-normal">Status</th>
						<th class="py-2.5 px-4 font-normal">Nama &amp; Perilaku AI</th>
						<th class="py-2.5 px-4 font-normal">Kanal &amp; Peran</th>
						<th class="py-2.5 px-4 font-normal">Nomor / Target</th>
						<th class="py-2.5 px-4 font-normal text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#F3F4F6]">
					{#each filteredRules as item (item.id)}
						<AccessRulesTableRow
							{item}
							isAnalyzing={analyzingTargetId === item.target_id}
							onToggleSelect={toggleSelect}
							onToggleBlock={toggleBlockStatus}
							onUpdatePersona={updateGroupPersona}
							onRefreshBehavior={refreshBehavior}
						/>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Table Footer -->
		<div class="px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs text-[#6B7280]">
			<span>{filteredRules.length} data ditampilkan</span>
			<span>Pengaturan tersimpan otomatis ke database.</span>
		</div>
	</div>
</div>
