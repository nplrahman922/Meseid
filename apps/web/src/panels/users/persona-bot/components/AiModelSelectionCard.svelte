<script lang="ts">
	import type { AiModelItem } from '../persona-bot.types';

	interface Props {
		isAutoSelect?: boolean;
		models?: AiModelItem[];
		onSelectModel?: (modelId: string) => void;
	}

	let {
		isAutoSelect = $bindable(false),
		models = $bindable([
			{
				id: '1',
				name: 'Qwen 3.6',
				jenis: 'Berbayar',
				tipe: 'LLM',
				isSelected: true
			},
			{
				id: '2',
				name: 'Kimi K3',
				jenis: 'Berbayar',
				tipe: 'LMM',
				isSelected: false
			},
			{
				id: '3',
				name: 'reflection/beem-free',
				jenis: 'Gratis',
				tipe: 'VLM',
				isSelected: false
			}
		]),
		onSelectModel
	}: Props = $props();

	let selectedCount = $derived(models.filter((m) => m.isSelected).length);

	function toggleAutoSelect() {
		isAutoSelect = !isAutoSelect;
	}

	function handleSelectModel(id: string) {
		// Single selection (radio toggle)
		models = models.map((m) => ({
			...m,
			isSelected: m.id === id
		}));
		if (onSelectModel) {
			onSelectModel(id);
		}
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Pemilihan Model AI
	</h2>

	<!-- Auto Select Toggle Box -->
	<div class="p-4 rounded-xl border border-[#E5E7EB] flex items-center gap-3 bg-white">
		<button
			type="button"
			aria-label="Toggle Pilih Bot secara Otomatis"
			onclick={toggleAutoSelect}
			class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {isAutoSelect ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
		>
			<span
				class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {isAutoSelect ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
			></span>
		</button>
		<div>
			<div class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Pilih Bot secara Otomatis
			</div>
			<div class="text-[11px] font-intel {isAutoSelect ? 'text-[#0E6B2B]' : 'text-[#6B7280]'}">
				{isAutoSelect ? 'Aktif' : 'Nonaktif'}
			</div>
		</div>
	</div>

	<!-- AI Models Table Container -->
	<div class="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
		<!-- Inner Header -->
		<div class="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
			<span class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Daftar Model AI
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
						<th class="py-2.5 px-4 font-normal">Nama Model</th>
						<th class="py-2.5 px-4 font-normal text-right">Jenis</th>
						<th class="py-2.5 px-4 font-normal text-right">Tipe</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#F3F4F6]">
					{#each models as model (model.id)}
						<tr class="hover:bg-[#F9FAFB] transition-colors">
							<!-- Status with Switch & Corrected Label -->
							<td class="py-3 px-4">
								<div class="flex items-center gap-2.5">
									<button
										type="button"
										aria-label="Pilih model {model.name}"
										onclick={() => handleSelectModel(model.id)}
										class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out {model.isSelected ? 'bg-[#0E6B2B]' : 'bg-[#D1D5DB]'}"
									>
										<span
											class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {model.isSelected ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
										></span>
									</button>
									<span class="text-[11px] font-intel {model.isSelected ? 'text-[#0E6B2B] font-medium' : 'text-[#6B7280]'}">
										{model.isSelected ? 'Aktif' : 'Nonaktif'}
									</span>
								</div>
							</td>
							<!-- Model Name -->
							<td class="py-3 px-4 font-medium text-[#111111]">
								{model.name}
							</td>
							<!-- Jenis (Berbayar / Gratis) -->
							<td class="py-3 px-4 text-right text-[#6B7280]">
								{model.jenis}
							</td>
							<!-- Tipe (LLM / LMM / VLM) -->
							<td class="py-3 px-4 text-right font-medium text-[#111111]">
								{model.tipe}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Table Footer -->
		<div class="px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs font-intel text-[#6B7280]">
			<span>3 dari 28 Model AI · Oktober 2026</span>
			<div class="flex items-center gap-3">
				<button type="button" class="hover:text-[#111111] cursor-pointer">Sebelumnya</button>
				<span class="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#111111]">1</span>
				<button type="button" class="hover:text-[#111111] cursor-pointer">Berikutnya</button>
			</div>
		</div>
	</div>
</div>
