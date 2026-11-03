<script lang="ts">
	import type { ReportType, ExportFormat } from '../dokumen.types';

	interface Props {
		onGenerate?: (data: { reportType: ReportType; periodText: string; exportFormat: ExportFormat }) => void;
	}

	let { onGenerate }: Props = $props();

	let selectedType = $state<ReportType>('laba_rugi');
	let periodValue = $state('1–16 Oktober 2026');
	let selectedFormat = $state<ExportFormat>('pdf');
	let isGenerating = $state(false);
	let successMsg = $state('');

	let previewText = $derived(
		selectedType === 'laba_rugi'
			? 'Preview Laba Rugi: pendapatan Rp 1.700.000 – beban bahan Rp 125.000 = laba Rp 1.575.000.'
			: 'Preview Neraca: total aset kas Rp 2.575.000 = ekuitas modal & laba berjalan Rp 2.575.000.'
	);

	let buttonLabel = $derived(`Buat laporan ${selectedFormat.toUpperCase()}`);

	function handleGenerate() {
		isGenerating = true;
		successMsg = '';
		setTimeout(() => {
			isGenerating = false;
			successMsg = `Laporan ${selectedType === 'laba_rugi' ? 'Laba Rugi' : 'Neraca'} (${selectedFormat.toUpperCase()}) berhasil disiapkan!`;
			onGenerate?.({
				reportType: selectedType,
				periodText: periodValue,
				exportFormat: selectedFormat
			});
			setTimeout(() => {
				successMsg = '';
			}, 3500);
		}, 600);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">Buat laporan</h2>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
		<!-- Left: Jenis Laporan & Periode -->
		<div class="space-y-5">
			<div>
				<span class="block text-xs font-semibold text-[#111111] mb-2">Jenis laporan</span>
				<div class="flex items-center gap-6 border-b border-[#E5E7EB]">
					<button
						type="button"
						onclick={() => (selectedType = 'laba_rugi')}
						class="pb-2 text-sm font-medium transition-colors relative {selectedType === 'laba_rugi'
							? 'text-[#16A34A] border-b-2 border-[#16A34A]'
							: 'text-[#6B7280] hover:text-[#111111]'}"
					>
						Laba Rugi
					</button>
					<button
						type="button"
						onclick={() => (selectedType = 'neraca')}
						class="pb-2 text-sm font-medium transition-colors relative {selectedType === 'neraca'
							? 'text-[#16A34A] border-b-2 border-[#16A34A]'
							: 'text-[#6B7280] hover:text-[#111111]'}"
					>
						Neraca
					</button>
				</div>
			</div>

			<div>
				<label for="periode-input" class="block text-xs font-semibold text-[#111111] mb-1.5">
					Periode
				</label>
				<input
					id="periode-input"
					type="text"
					bind:value={periodValue}
					class="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
					placeholder="Contoh: 1–16 Oktober 2026"
				/>
				<p class="mt-1.5 text-xs text-[#6B7280]">
					Untuk Neraca, posisi saldo per akhir periode.
				</p>
			</div>
		</div>

		<!-- Right: Format Ekspor, Preview, & Submit -->
		<div class="space-y-4 flex flex-col justify-between">
			<div class="space-y-3">
				<span class="block text-xs font-semibold text-[#111111]">Format ekspor</span>
				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={() => (selectedFormat = 'pdf')}
						class="px-4 py-1.5 text-xs font-medium rounded-lg border transition-all {selectedFormat === 'pdf'
							? 'border-[#111111] bg-white text-[#111111]'
							: 'border-[#D1D5DB] bg-white text-[#4B5563] hover:border-gray-400'}"
					>
						PDF {selectedFormat === 'pdf' ? '✓' : ''}
					</button>
					<button
						type="button"
						onclick={() => (selectedFormat = 'word')}
						class="px-4 py-1.5 text-xs font-medium rounded-lg border transition-all {selectedFormat === 'word'
							? 'border-[#111111] bg-white text-[#111111]'
							: 'border-[#D1D5DB] bg-white text-[#4B5563] hover:border-gray-400'}"
					>
						Word {selectedFormat === 'word' ? '✓' : ''}
					</button>
					<button
						type="button"
						onclick={() => (selectedFormat = 'excel')}
						class="px-4 py-1.5 text-xs font-medium rounded-lg border transition-all {selectedFormat === 'excel'
							? 'border-[#111111] bg-white text-[#111111]'
							: 'border-[#D1D5DB] bg-white text-[#4B5563] hover:border-gray-400'}"
					>
						Excel {selectedFormat === 'excel' ? '✓' : ''}
					</button>
				</div>

				<p class="text-xs text-[#6B7280] leading-relaxed pt-1">
					{previewText}
				</p>
			</div>

			<div>
				{#if successMsg}
					<div class="text-xs font-medium text-[#16A34A] bg-[#F0FDF4] border border-[#DCFCE7] p-2 rounded-lg mb-2">
						{successMsg}
					</div>
				{/if}
				<button
					type="button"
					onclick={handleGenerate}
					disabled={isGenerating}
					class="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
				>
					{isGenerating ? 'Memproses...' : buttonLabel}
				</button>
			</div>
		</div>
	</div>
</div>
