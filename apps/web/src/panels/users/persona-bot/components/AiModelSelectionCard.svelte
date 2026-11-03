<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '../../../../auth/authStore';
	import type { AiModelItem } from '../persona-bot.types';
	import { DEFAULT_TESTED_MODELS } from '../persona-bot.constants';

	interface Props {
		isPro?: boolean;
		isAutoSelect?: boolean;
		onSelectModel?: (modelId: string) => void;
	}

	let {
		isPro: propIsPro,
		isAutoSelect = $bindable(false),
		onSelectModel
	}: Props = $props();

	// Deteksi hak akses dari prop atau authState
	let isUserPro = $derived(
		propIsPro ?? ($authState.subscription?.plan_name?.toLowerCase() === 'pro')
	);

	let models = $state<AiModelItem[]>(DEFAULT_TESTED_MODELS);
	let isSaving = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'warning' | 'error'>('success');
	let currentPage = $state(1);
	const pageSize = 5;

	// Perbarui status aksesibilitas berdasarkan plan akun
	$effect(() => {
		const pro = isUserPro;
		models = models.map((m) => ({
			...m,
			isAccessible: pro ? true : m.tier === 'free'
		}));
	});

	let totalPages = $derived(Math.ceil(models.length / pageSize));
	let paginatedModels = $derived(
		models.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);
	let selectedCount = $derived(models.filter((m) => m.isSelected).length);
	let activeModelName = $derived(models.find((m) => m.isSelected)?.name || 'Belum dipilih');

	function showToast(msg: string, type: 'success' | 'warning' | 'error' = 'success') {
		toastMessage = msg;
		toastType = type;
		setTimeout(() => {
			toastMessage = '';
		}, 3800);
	}

	async function loadModelsFromApi() {
		try {
			const res = await fetch('/api/owner/personalisasi/models', {
				headers: { Accept: 'application/json' },
				credentials: 'include'
			});
			if (res.ok) {
				const json = await res.json();
				if (json.data?.models && Array.isArray(json.data.models)) {
					const apiModels: AiModelItem[] = json.data.models.map((m: any) => ({
						id: m.id || m.model_id,
						model_id: m.model_id,
						name: m.name || m.model_id,
						provider: m.provider,
						jenis: m.jenis || (m.tier === 'free' ? 'Gratis' : 'Berbayar'),
						tier: m.tier || 'free',
						tipe: m.tipe || 'LLM',
						score: m.score ?? 90,
						badge: m.badge,
						isAccessible: m.is_accessible,
						isSelected: m.is_current
					}));
					if (apiModels.length > 0) {
						models = apiModels;
					}
				}
			}
		} catch {
			// Fallback ke DEFAULT_TESTED_MODELS
		}
	}

	async function handleSelectModel(model: AiModelItem) {
		if (!model.isAccessible) {
			showToast(
				`🔒 Model "${model.name}" khusus Akun Pro. Akun Gratis hanya dapat mengakses model Gratis. Silakan upgrade di tab Langganan!`,
				'warning'
			);
			return;
		}

		models = models.map((m) => ({
			...m,
			isSelected: m.model_id === model.model_id
		}));
		isAutoSelect = false;

		if (onSelectModel) {
			onSelectModel(model.model_id);
		}

		try {
			isSaving = true;
			const res = await fetch('/api/owner/personalisasi', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ selected_model_id: model.model_id })
			});

			if (res.ok) {
				showToast(`✓ Model aktif: ${model.name} (${model.jenis})`, 'success');
			} else {
				const errData = await res.json().catch(() => ({}));
				showToast(errData.message || 'Gagal mengubah model bot.', 'error');
			}
		} catch {
			showToast('Gagal terhubung ke server untuk menyimpan model.', 'error');
		} finally {
			isSaving = false;
		}
	}

	async function toggleAutoSelect() {
		isAutoSelect = !isAutoSelect;
		if (isAutoSelect) {
			const targetModelId = isUserPro ? 'google/gemini-2.5-flash' : 'reflection/beam-free';
			const target = models.find((m) => m.model_id === targetModelId) || models[0];
			if (target && target.isAccessible) {
				await handleSelectModel(target);
				showToast(
					`✓ Otomatis memilih model optimal: ${target.name} (${isUserPro ? 'Paket Pro' : 'Paket Gratis'})`,
					'success'
				);
			}
		}
	}

	onMount(() => {
		loadModelsFromApi();
	});
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs relative">
	<!-- Card Title & Status Badge -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
				Pemilihan Model AI
			</h2>
			<p class="text-xs text-[#6B7280] mt-0.5">
				Pilih mesin kecerdasan buatan teruji untuk melayani pelanggan dan mencatat transaksi usaha Anda.
			</p>
		</div>
		<div class="hidden sm:flex items-center gap-2">
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {isUserPro ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">
				{isUserPro ? '👑 Akun Pro (Semua Model)' : '🌱 Akun Gratis (Model Gratis)'}
			</span>
		</div>
	</div>

	<!-- Auto Select Toggle Box -->
	<div class="p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between bg-white">
		<div class="flex items-center gap-3">
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
					{isAutoSelect ? 'Aktif (Memilih model terbaik sesuai paket Anda)' : 'Nonaktif (Pilih manual di bawah)'}
				</div>
			</div>
		</div>

		<div class="text-xs font-intel text-[#4B5563]">
			Model saat ini: <strong class="text-[#111111]">{activeModelName}</strong>
		</div>
	</div>

	<!-- AI Models Table Container -->
	<div class="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
		<div class="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAFAFA]">
			<span class="text-xs sm:text-sm font-intel font-medium text-[#111111]">
				Daftar Model AI Teruji
			</span>
			<div class="flex items-center gap-3">
				<span class="text-xs font-intel text-[#6B7280]">
					{selectedCount} dipilih
				</span>
				{#if isSaving}
					<span class="text-xs text-[#0E6B2B] animate-pulse">Menyimpan...</span>
				{/if}
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs font-intel">
				<thead class="text-[#6B7280] border-b border-[#E5E7EB] bg-white">
					<tr>
						<th class="py-2.5 px-4 font-normal">Status</th>
						<th class="py-2.5 px-4 font-normal">Nama Model</th>
						<th class="py-2.5 px-4 font-normal text-center">Skor Uji</th>
						<th class="py-2.5 px-4 font-normal text-right">Jenis</th>
						<th class="py-2.5 px-4 font-normal text-right">Tipe</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#F3F4F6]">
					{#each paginatedModels as model (model.model_id)}
						<tr class="hover:bg-[#F9FAFB] transition-colors {!model.isAccessible ? 'opacity-65 bg-gray-50/50' : ''}">
							<td class="py-3 px-4">
								<div class="flex items-center gap-2.5">
									<button
										type="button"
										disabled={!model.isAccessible}
										aria-label="Pilih model {model.name}"
										onclick={() => handleSelectModel(model)}
										class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out {!model.isAccessible ? 'cursor-not-allowed bg-[#E5E7EB]' : model.isSelected ? 'cursor-pointer bg-[#0E6B2B]' : 'cursor-pointer bg-[#D1D5DB]'}"
									>
										<span
											class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[3px] {model.isSelected ? 'translate-x-4.5 ml-0' : 'translate-x-1'}"
										></span>
									</button>
									<span class="text-[11px] font-intel {model.isSelected ? 'text-[#0E6B2B] font-medium' : 'text-[#6B7280]'}">
										{#if !model.isAccessible}
											<span class="text-amber-700 font-medium">Terkunci</span>
										{:else}
											{model.isSelected ? 'Aktif' : 'Nonaktif'}
										{/if}
									</span>
								</div>
							</td>

							<td class="py-3 px-4 font-medium text-[#111111]">
								<div class="flex items-center gap-2 flex-wrap">
									<span>{model.name}</span>
									{#if model.badge}
										<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium {model.tier === 'free' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
											{model.badge}
										</span>
									{/if}
									{#if !model.isAccessible}
										<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
											🔒 Perlu Pro
										</span>
									{/if}
								</div>
							</td>

							<td class="py-3 px-4 text-center">
								<span class="inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold text-[11px] {(model.score ?? 90) >= 95 ? 'bg-emerald-50 text-emerald-800' : (model.score ?? 90) >= 90 ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}">
									{model.score}%
								</span>
							</td>

							<td class="py-3 px-4 text-right">
								<span class="inline-block px-2 py-0.5 rounded-full text-[11px] {model.jenis === 'Gratis' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-[#6B7280]'}">
									{model.jenis}
								</span>
							</td>

							<td class="py-3 px-4 text-right font-medium text-[#111111]">
								{model.tipe}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs font-intel text-[#6B7280]">
			<span>{models.length} Model AI Teruji · November 2026</span>
			<div class="flex items-center gap-2">
				<button
					type="button"
					disabled={currentPage === 1}
					onclick={() => currentPage = Math.max(1, currentPage - 1)}
					class="px-2 py-1 rounded hover:text-[#111111] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
				>
					Sebelumnya
				</button>
				{#each Array(totalPages) as _, idx}
					<button
						type="button"
						onclick={() => currentPage = idx + 1}
						class="w-6 h-6 flex items-center justify-center rounded border text-xs cursor-pointer {currentPage === idx + 1 ? 'bg-white border-[#111111] font-medium text-[#111111] shadow-2xs' : 'border-[#E5E7EB] text-[#6B7280] hover:text-[#111111]'}"
					>
						{idx + 1}
					</button>
				{/each}
				<button
					type="button"
					disabled={currentPage === totalPages}
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
					class="px-2 py-1 rounded hover:text-[#111111] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
				>
					Berikutnya
				</button>
			</div>
		</div>
	</div>

	{#if toastMessage}
		<div class="p-3 rounded-xl border text-xs flex items-center justify-between shadow-lg transition-all {toastType === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : toastType === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-red-50 text-red-900 border-red-200'}">
			<span>{toastMessage}</span>
			<button type="button" onclick={() => toastMessage = ''} class="font-bold ml-2 text-gray-500 hover:text-gray-900 cursor-pointer">✕</button>
		</div>
	{/if}
</div>
