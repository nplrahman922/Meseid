<script lang="ts">
	import type { AccessRuleItem } from '../kanal.types';

	interface Props {
		item: AccessRuleItem;
		isAnalyzing: boolean;
		onToggleSelect: (id: string) => void;
		onToggleBlock: (item: AccessRuleItem) => void;
		onUpdatePersona: (item: AccessRuleItem, persona: 'assistant' | 'admin') => void;
		onRefreshBehavior: (item: AccessRuleItem) => void;
	}

	let {
		item,
		isAnalyzing,
		onToggleSelect,
		onToggleBlock,
		onUpdatePersona,
		onRefreshBehavior
	}: Props = $props();

	function getCategoryBadgeClass(label: string | null): string {
		if (!label) return 'bg-gray-100 text-gray-600 border-gray-200';
		const l = label.toLowerCase();
		if (l.includes('owner') || l.includes('pemilik')) {
			return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
		}
		if (l.includes('pembeli aktif') || l.includes('aktif bertransaksi')) {
			return 'bg-emerald-100/70 text-emerald-900 border-emerald-300';
		}
		if (l.includes('loyal') || l.includes('vip') || l.includes('komunitas')) {
			return 'bg-purple-50 text-purple-800 border-purple-200';
		}
		if (l.includes('calon') || l.includes('tanya')) {
			return 'bg-amber-50 text-amber-800 border-amber-200';
		}
		if (l.includes('ramah') || l.includes('pasar') || l.includes('jual beli')) {
			return 'bg-sky-50 text-sky-800 border-sky-200';
		}
		if (l.includes('operasional') || l.includes('staff') || l.includes('tim')) {
			return 'bg-slate-100 text-slate-800 border-slate-300';
		}
		if (l.includes('manajemen') || l.includes('finansial')) {
			return 'bg-teal-50 text-teal-800 border-teal-300';
		}
		if (l.includes('proyek') || l.includes('event') || l.includes('kritis') || l.includes('komplain')) {
			return 'bg-orange-50 text-orange-800 border-orange-200';
		}
		if (l.includes('kasar') || l.includes('toksik') || l.includes('spam')) {
			return 'bg-red-50 text-red-800 border-red-200';
		}
		return 'bg-gray-100 text-gray-700 border-gray-200';
	}
</script>

<tr class="hover:bg-[#F9FAFB] transition-colors font-intel">
	<!-- Status & Checkbox -->
	<td class="py-3 px-4 align-top">
		<div class="flex items-center gap-2">
			<input
				type="checkbox"
				checked={item.isSelected}
				onchange={() => onToggleSelect(item.id)}
				class="w-4 h-4 rounded text-[#0E6B2B] border-[#D1D5DB] focus:ring-[#0E6B2B] cursor-pointer"
			/>
			{#if item.status === 'active'}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
					<span>✓</span>
					Active
				</span>
			{:else if item.status === 'blocked'}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
					<svg class="w-3 h-3 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
					Blocked
				</span>
			{:else}
				<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-normal bg-gray-100 text-gray-600">
					Disabled
				</span>
			{/if}
		</div>
	</td>

	<!-- Name, Custom Label & Nemotron Behavior Summary -->
	<td class="py-3 px-4 align-top max-w-xs">
		<div class="flex items-center gap-2 flex-wrap mb-1">
			<span class="font-medium text-[#111111]">{item.target_name}</span>
			{#if item.custom_label}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border {getCategoryBadgeClass(item.custom_label)}">
					{item.custom_label}
				</span>
			{/if}
		</div>
		<!-- Behavioral Profiling -->
		<div class="p-2 rounded-lg bg-gray-50/80 border border-gray-100 text-[11px] text-gray-700">
			<div class="flex items-start justify-between gap-1">
				<p class="leading-relaxed">
					{item.behavior_summary || 'Belum ada profil perilaku.'}
				</p>
				<button
					type="button"
					title="Refresh Analisis Perilaku AI"
					disabled={isAnalyzing}
					onclick={() => onRefreshBehavior(item)}
					class="p-1 text-gray-400 hover:text-[#0E6B2B] rounded cursor-pointer disabled:opacity-50 shrink-0"
				>
					<svg class="w-3.5 h-3.5 {isAnalyzing ? 'animate-spin text-[#0E6B2B]' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
				</button>
			</div>
		</div>
	</td>

	<!-- Channel, Type & Role Persona Selector -->
	<td class="py-3 px-4 align-top">
		<div class="space-y-1.5">
			<div class="flex items-center gap-1.5">
				<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {item.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'}">
					{item.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
				</span>
				<span class="text-[10px] text-gray-500">
					{item.target_type === 'group' ? 'Grup' : 'Nomor'}
				</span>
			</div>

			<div class="flex items-center gap-1">
				<select
					value={item.persona_mode || 'admin'}
					disabled={item.is_owner}
					onchange={(e) => onUpdatePersona(item, (e.target as HTMLSelectElement).value as any)}
					class="text-[11px] py-1 px-2 rounded-md border font-medium focus:outline-none transition-colors {item.is_owner ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} {item.persona_mode === 'assistant' ? 'border-[#C6F0C2] bg-[#E8F9E6]/60 text-[#0E6B2B] focus:border-[#0E6B2B]' : 'border-gray-200 bg-white text-gray-700 focus:border-gray-400'}"
					title={item.is_owner ? 'Peran akun pemilik toko dilindungi dan selalu berperan sebagai Asisten Bisnis' : 'Pilih peran AI untuk target ini'}
				>
					<option value="assistant">
						{item.target_type === 'group' ? 'Asisten Bisnis (Tim Internal)' : 'Asisten Bisnis (Owner/Tim)'}
					</option>
					<option value="admin">
						{item.target_type === 'group' ? 'Admin Toko (Pelanggan/Publik)' : 'Admin Toko (Pelanggan/Tamu)'}
					</option>
				</select>
			</div>
		</div>
	</td>

	<!-- Target ID (Phone number or Group ID) -->
	<td class="py-3 px-4 align-top font-mono text-[11px] text-gray-800">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span>{item.target_id}</span>
			{#if item.is_owner}
				<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
					Owner
				</span>
			{/if}
		</div>
	</td>

	<!-- Action Buttons -->
	<td class="py-3 px-4 align-top text-right">
		{#if item.is_owner}
			<span
				class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed select-none"
				title="Nomor kontak utama pemilik toko dilindungi dari pemblokiran"
			>
				<svg class="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
				</svg>
				<span>Terlindungi</span>
			</span>
		{:else}
			<button
				type="button"
				onclick={() => onToggleBlock(item)}
				class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors {item.status === 'blocked' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'}"
			>
				{#if item.status === 'blocked'}
					<span>✓ Buka Blokir</span>
				{:else}
					<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
					<span>Blokir</span>
				{/if}
			</button>
		{/if}
	</td>
</tr>
