<script lang="ts">
	import type { CsvKnowledgeBaseItem } from '../knowledge-base.types';

	interface Props {
		isOpen?: boolean;
		onImport?: (items: CsvKnowledgeBaseItem[]) => Promise<void>;
		onClose?: () => void;
	}

	let { isOpen = false, onImport, onClose }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let parsedItems = $state<CsvKnowledgeBaseItem[]>([]);
	let fileName = $state('');
	let parseError = $state('');
	let isSubmitting = $state(false);

	function resetState() {
		parsedItems = [];
		fileName = '';
		parseError = '';
		isSubmitting = false;
		if (fileInput) fileInput.value = '';
	}

	function handleClose() {
		resetState();
		onClose?.();
	}

	function parseCsvText(text: string): CsvKnowledgeBaseItem[] {
		const lines = text
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		if (lines.length < 2) {
			throw new Error('File CSV kosong atau hanya memiliki header.');
		}

		const delimiter = lines[0].includes(';') ? ';' : ',';
		const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

		const titleIdx = headers.findIndex((h) => h === 'title' || h === 'judul');
		const catIdx = headers.findIndex((h) => h === 'category' || h === 'kategori');
		const contentIdx = headers.findIndex(
			(h) => h === 'content' || h === 'jawaban' || h === 'isi' || h === 'detail'
		);
		const internalIdx = headers.findIndex((h) => h === 'is_internal' || h === 'internal');

		if (titleIdx === -1 || contentIdx === -1) {
			throw new Error('Header CSV wajib memiliki kolom "Judul" (title) dan "Jawaban" (content).');
		}

		const results: CsvKnowledgeBaseItem[] = [];
		for (let i = 1; i < lines.length; i++) {
			const row = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
			if (row.length <= Math.max(titleIdx, contentIdx)) continue;

			const title = row[titleIdx];
			const content = row[contentIdx];
			const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Umum';
			const isInternal =
				internalIdx !== -1
					? ['true', '1', 'ya', 'yes', 'internal'].includes(row[internalIdx]?.toLowerCase())
					: false;

			if (title && content) {
				results.push({
					title,
					category,
					content,
					is_internal: isInternal
				});
			}
		}

		if (results.length === 0) {
			throw new Error('Tidak ada baris data valid yang dapat diimpor.');
		}

		return results;
	}

	function handleFileChange(e: Event) {
		parseError = '';
		parsedItems = [];
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		fileName = file.name;
		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				parsedItems = parseCsvText(content);
			} catch (err: any) {
				parseError = err.message || 'Format CSV tidak valid.';
			}
		};
		reader.onerror = () => {
			parseError = 'Gagal membaca berkas CSV.';
		};
		reader.readAsText(file);
	}

	async function handleSubmit() {
		if (parsedItems.length === 0 || isSubmitting) return;
		isSubmitting = true;
		try {
			if (onImport) {
				await onImport(parsedItems);
			}
			handleClose();
		} catch (err: any) {
			parseError = err.message || 'Gagal menyimpan data impor.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-xl bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5 shadow-xl">
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
				<div>
					<h3 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
						Import Knowledge Base dari CSV
					</h3>
					<p class="text-xs font-inter text-[#6B7280]">
						Unggah file CSV dengan kolom: <code class="font-mono bg-gray-100 px-1 py-0.5 rounded">Judul, Kategori, Jawaban, Internal</code>
					</p>
				</div>
				<button
					type="button"
					onclick={handleClose}
					class="text-[#9CA3AF] hover:text-[#111111] text-lg font-bold p-1 cursor-pointer"
				>
					✕
				</button>
			</div>

			<!-- Upload Area -->
			<div class="space-y-3 text-xs font-intel">
				<div class="flex items-center gap-3">
					<input
						bind:this={fileInput}
						type="file"
						accept=".csv"
						onchange={handleFileChange}
						class="block w-full text-xs text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-intel file:font-medium file:bg-[#E8F9E6] file:text-[#0E6B2B] hover:file:bg-[#d6f5d2] cursor-pointer"
					/>
				</div>

				{#if parseError}
					<div class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-inter">
						{parseError}
					</div>
				{/if}

				<!-- Preview Table -->
				{#if parsedItems.length > 0}
					<div class="space-y-2 pt-2">
						<div class="flex items-center justify-between text-xs font-intel text-[#111111] font-medium">
							<span>Pratinjau ({parsedItems.length} baris siap diimpor):</span>
							<span class="text-[#0E6B2B] text-[11px]">Valid ✓</span>
						</div>
						<div class="max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-xl">
							<table class="w-full text-left text-xs font-intel divide-y divide-[#E5E7EB]">
								<thead class="bg-[#F9FAFB] text-[#6B7280]">
									<tr>
										<th class="py-2 px-3">Judul</th>
										<th class="py-2 px-3">Kategori</th>
										<th class="py-2 px-3">Tipe</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-[#F3F4F6] bg-white">
									{#each parsedItems.slice(0, 5) as item}
										<tr>
											<td class="py-2 px-3 font-medium text-[#111111] truncate max-w-[150px]">{item.title}</td>
											<td class="py-2 px-3 text-[#6B7280]">{item.category}</td>
											<td class="py-2 px-3">
												{#if item.is_internal}
													<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-medium">Internal</span>
												{:else}
													<span class="px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-[#0E6B2B] font-medium">Publik</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
							{#if parsedItems.length > 5}
								<div class="p-2 text-center text-[11px] text-[#9CA3AF] bg-gray-50 border-t border-[#E5E7EB]">
									...dan {parsedItems.length - 5} baris lainnya
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
				<button
					type="button"
					onclick={handleClose}
					disabled={isSubmitting}
					class="px-4 py-2 text-xs sm:text-sm font-intel text-[#4B5563] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={handleSubmit}
					disabled={parsedItems.length === 0 || isSubmitting}
					class="px-4 py-2 text-xs sm:text-sm font-intel font-medium text-[#111111] bg-[#1ED10E] hover:bg-[#1bb80d] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl cursor-pointer shadow-xs"
				>
					{isSubmitting ? 'Mengimpor...' : `Impor ${parsedItems.length} Entri`}
				</button>
			</div>
		</div>
	</div>
{/if}
