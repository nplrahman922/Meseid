<script lang="ts">
	import type { WhitelistContactItem } from '../kanal.types';

	interface Props {
		isOpenForAll?: boolean;
		items?: WhitelistContactItem[];
		onToggleOpenForAll?: (val: boolean) => void;
	}

	let {
		isOpenForAll = $bindable(false),
		items = $bindable([
			{
				id: '1',
				name: 'Penjualan teh',
				type: 'Grup',
				target: 'Tim Admin Bu Rina',
				isActive: true,
				isSelected: true
			},
			{
				id: '2',
				name: 'Belanja bahan',
				type: 'Nomor',
				target: '081345678***',
				isActive: false,
				isSelected: false
			},
			{
				id: '3',
				name: 'Pesanan katering',
				type: 'Nomor',
				target: '085192837***',
				isActive: false,
				isSelected: false
			}
		]),
		onToggleOpenForAll
	}: Props = $props();

	let selectedCount = $derived(items.filter((i) => i.isSelected).length);

	function toggleGlobalAccess() {
		isOpenForAll = !isOpenForAll;
		if (onToggleOpenForAll) {
			onToggleOpenForAll(isOpenForAll);
		}
	}

	function toggleSelect(id: string) {
		items = items.map((item) =>
			item.id === id ? { ...item, isSelected: !item.isSelected } : item
		);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Hak Akses Grup &amp; Daftar Nomor
	</h2>

	<!-- Global Access Toggle Box -->
	<div class="flex items-center gap-3">
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
			<div class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Terbuka Untuk Semua Nomor
			</div>
			<div class="text-[11px] font-intel {isOpenForAll ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
				{isOpenForAll ? 'Aktif' : 'Nonaktif'}
			</div>
		</div>
	</div>

	<!-- Whitelist Table Container -->
	<div class="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
		<!-- Inner Table Header -->
		<div class="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
			<span class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Daftar Nomor &amp; Grup Terdaftar
			</span>
			<span class="text-xs font-intel text-[#6B7280]">
				{selectedCount} dipilih
			</span>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs font-intel">
				<thead class="text-[#6B7280] border-b border-[#E5E7EB] bg-white">
					<tr>
						<th class="py-2.5 px-4 font-normal">Status</th>
						<th class="py-2.5 px-4 font-normal">Nama / Deskripsi</th>
						<th class="py-2.5 px-4 font-normal">Jenis</th>
						<th class="py-2.5 px-4 font-normal text-right">Nomor / Grup</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#F3F4F6]">
					{#each items as item (item.id)}
						<tr class="hover:bg-[#F9FAFB] transition-colors">
							<!-- Status & Checkbox -->
							<td class="py-3 px-4">
								<div class="flex items-center gap-2.5">
									<input
										type="checkbox"
										checked={item.isSelected}
										onchange={() => toggleSelect(item.id)}
										class="w-4 h-4 rounded text-[#0E6B2B] border-[#D1D5DB] focus:ring-[#0E6B2B] cursor-pointer"
									/>
									{#if item.isActive}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
											<span>✓</span>
											Active
										</span>
									{:else}
										<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-intel font-normal bg-[#F3F4F6] text-[#6B7280]">
											Disabled
										</span>
									{/if}
								</div>
							</td>
							<!-- Name / Description -->
							<td class="py-3 px-4 font-inter text-[#111111]">
								{item.name}
							</td>
							<!-- Type -->
							<td class="py-3 px-4 text-[#6B7280]">
								{item.type}
							</td>
							<!-- Target (Group Name / Phone Number) -->
							<td class="py-3 px-4 text-right font-medium text-[#111111]">
								{item.target}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Table Footer & Pagination -->
		<div class="px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs font-intel text-[#6B7280]">
			<span>3 dari 28 kontak · Oktober 2026</span>
			<div class="flex items-center gap-3">
				<button type="button" class="hover:text-[#111111] cursor-pointer">Sebelumnya</button>
				<span class="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#111111]">1</span>
				<button type="button" class="hover:text-[#111111] cursor-pointer">Berikutnya</button>
			</div>
		</div>
	</div>
</div>
