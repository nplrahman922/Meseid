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

	// Tab aktif: 'assistant' (Asisten Pemilik) atau 'admin' (Admin Toko Publik)
	let activeTab = $state<'assistant' | 'admin'>('assistant');

	// Model yang dipilih untuk masing-masing bot
	let assistantModelId = $state<string>('nemotron-free');
	let adminModelId = $state<string>('nemotron-free');

	// Helper menentukan apakah model dapat diakses oleh user saat ini
	function isModelAvailable(model: AiModelItem): boolean {
		return isUserPro || model.tier === 'free' || Boolean(model.isAccessible);
	}

	let models = $state<AiModelItem[]>(DEFAULT_TESTED_MODELS);
	let isSaving = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'warning' | 'error'>('success');

	// Nama model terpilih
	let assistantModelName = $derived(
		models.find(
			(m) =>
				m.preset_code === assistantModelId ||
				m.model_id === assistantModelId ||
				m.id === assistantModelId
		)?.name || 'Nemotron 3.5 Free'
	);
	let adminModelName = $derived(
		models.find(
			(m) =>
				m.preset_code === adminModelId ||
				m.model_id === adminModelId ||
				m.id === adminModelId
		)?.name || 'Nemotron 3.5 Free'
	);

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
				const rawModels = json.models || json.data?.models;
				if (rawModels && Array.isArray(rawModels)) {
					const apiModels: AiModelItem[] = rawModels.map((m: any) => ({
						id: m.id || m.preset_code || m.model_id,
						preset_code: m.preset_code,
						model_id: m.model_id,
						name: m.display_name || m.name || m.model_id,
						display_name: m.display_name || m.name,
						description: m.description,
						provider: m.provider,
						jenis: m.jenis || (m.tier === 'free' ? 'Gratis' : 'Berbayar'),
						tier: m.tier || 'free',
						tipe: m.tipe || 'LLM',
						score: m.score ?? 95,
						badge: m.badge,
						supports_vision: Boolean(m.supports_vision),
						supports_audio: Boolean(m.supports_audio),
						supports_web_search: Boolean(m.supports_web_search),
						supports_reasoning: Boolean(m.supports_reasoning),
						isAccessible: Boolean(m.is_accessible ?? (isUserPro || m.tier === 'free')),
						isSelected: Boolean(m.is_current)
					}));
					if (apiModels.length > 0) {
						models = apiModels;
					}
				}

				// Ambil model aktif untuk masing-masing bot
				const activeAssistant = json.current_assistant_model_id || json.data?.current_assistant_model_id;
				const activeAdmin = json.current_admin_model_id || json.data?.current_admin_model_id;

				if (activeAssistant) assistantModelId = activeAssistant;
				if (activeAdmin) adminModelId = activeAdmin;
			}
		} catch {
			// Fallback ke default
		}
	}

	async function handleSelectModel(model: AiModelItem) {
		if (!isModelAvailable(model)) {
			showToast(
				`🔒 Model "${model.name}" adalah fitur eksklusif Akun Pro. Silakan upgrade paket langganan Anda di tab Billing!`,
				'warning'
			);
			return;
		}

		const targetIdentifier = model.preset_code || model.model_id;
		const isAssistantTarget = activeTab === 'assistant';

		if (isAssistantTarget) {
			assistantModelId = targetIdentifier;
		} else {
			adminModelId = targetIdentifier;
		}

		isAutoSelect = false;

		if (onSelectModel) {
			onSelectModel(targetIdentifier);
		}

		try {
			isSaving = true;
			const payload = isAssistantTarget
				? { assistant_model_id: targetIdentifier }
				: { admin_model_id: targetIdentifier };

			const res = await fetch('/api/owner/personalisasi', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				const botLabel = isAssistantTarget ? 'AI Asisten Pemilik' : 'AI Admin Toko';
				showToast(`✓ Model ${botLabel} berhasil diatur ke: ${model.name}`, 'success');
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

	function isCurrentSelected(model: AiModelItem): boolean {
		const targetId = activeTab === 'assistant' ? assistantModelId : adminModelId;
		if (!targetId) return false;
		return (
			model.preset_code === targetId ||
			model.model_id === targetId ||
			model.id === targetId
		);
	}

	onMount(() => {
		loadModelsFromApi();
	});
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs relative">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div>
			<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
				Pilihan Mesin AI Bot Usaha
			</h2>
			<p class="text-xs text-[#6B7280] mt-0.5">
				Atur model AI terpisah untuk asisten bisnis Anda dan layanan pelanggan toko.
			</p>
		</div>
		<div class="flex items-center gap-2 self-start sm:self-auto">
			<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium {isUserPro ? 'bg-amber-50 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-900 border border-emerald-300'}">
				{#if isUserPro}
					<svg class="w-3.5 h-3.5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg>
					<span>Akun Pro (Bebas Pilih Kedua Bot)</span>
				{:else}
					<svg class="w-3.5 h-3.5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
					<span>Akun Gratis (Model Gratis)</span>
				{/if}
			</span>
			{#if isSaving}
				<span class="text-xs text-[#0E6B2B] animate-pulse font-medium">Menyimpan...</span>
			{/if}
		</div>
	</div>

	<!-- Tab Switcher: Asisten vs Admin Toko -->
	<div class="border-b border-gray-200">
		<div class="flex gap-6">
			<button
				type="button"
				class="pb-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab === 'assistant' ? 'border-[#0E6B2B] text-[#0E6B2B] font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'}"
				onclick={() => activeTab = 'assistant'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				<span>Asisten Pemilik</span>
				<span class="text-[10px] px-1.5 py-0.5 rounded font-normal {activeTab === 'assistant' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}">
					{assistantModelName}
				</span>
			</button>
			<button
				type="button"
				class="pb-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab === 'admin' ? 'border-[#0E6B2B] text-[#0E6B2B] font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'}"
				onclick={() => activeTab = 'admin'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				<span>Admin Toko</span>
				<span class="text-[10px] px-1.5 py-0.5 rounded font-normal {activeTab === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}">
					{adminModelName}
				</span>
			</button>
		</div>
	</div>

	<!-- Role Guidance Banner -->
	<div class="p-3 rounded-xl border text-xs {activeTab === 'assistant' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-blue-50/50 border-blue-200 text-blue-900'}">
		{#if activeTab === 'assistant'}
			<p>
				<strong>Khusus Asisten Pribadi:</strong> Menjawab pesan privat pemilik, membaca foto struk belanja (VLM), mendengar rekaman Voice Note (Audio), dan riset harga supplier di internet. <em>Rekomendasi Pro: Gemini 3.8 Flash / Gemini 2.5 Pro.</em>
			</p>
		{:else}
			<p>
				<strong>Khusus Admin Toko Publik:</strong> Menjawab pertanyaan pelanggan umum di WhatsApp &amp; Telegram berbasis Knowledge Base. <em>Rekomendasi: Tetap gunakan Nemotron Free agar chat ribuan pelanggan tetap Rp 0 (gratis selamanya).</em>
			</p>
		{/if}
	</div>

	<!-- Models Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each models as model (model.model_id)}
			{@const isSelected = isCurrentSelected(model)}
			<div
				class="group relative rounded-xl border p-4 transition-all duration-200 {isSelected ? 'border-[#0E6B2B] bg-emerald-50/20 ring-1 ring-[#0E6B2B]' : 'border-[#E5E7EB] bg-white hover:border-gray-300'} {!isModelAvailable(model) ? 'opacity-75 bg-gray-50/60' : 'cursor-pointer'}"
				onclick={() => handleSelectModel(model)}
				role="radio"
				aria-checked={isSelected}
				aria-label="Pilih model {model.name}"
				tabindex={isModelAvailable(model) ? 0 : -1}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectModel(model); }}
			>
				<!-- Top Bar: Badge & Radio -->
				<div class="flex items-center justify-between gap-2 mb-2">
					<div class="flex items-center gap-1.5 flex-wrap">
						<span class="text-xs font-intel font-semibold text-[#111111]">{model.name}</span>
						{#if model.badge}
							<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium {model.tier === 'free' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
								{model.badge}
							</span>
						{/if}
						{#if !isModelAvailable(model)}
							<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900">
								<svg class="w-3 h-3 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
								<span>Khusus Pro</span>
							</span>
						{/if}
					</div>

					<!-- Bullet Radio Indicator (Selalu tampil konsisten dan responsif saat dipencet) -->
					<div class="flex items-center">
						<div
							class="h-4 w-4 rounded-full border flex items-center justify-center transition-all {isSelected ? 'border-[#0E6B2B] bg-white ring-2 ring-[#0E6B2B]/25 shadow-xs' : 'border-gray-300 bg-white group-hover:border-gray-400'}"
							aria-hidden="true"
						>
							{#if isSelected}
								<div class="h-2 w-2 rounded-full bg-[#0E6B2B] transition-transform"></div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Description -->
				<p class="text-xs text-[#4B5563] leading-relaxed mb-3">
					{model.description || 'Model kecerdasan buatan untuk otomatisasi chat dan transaksi.'}
				</p>

				<!-- Capability Pills & Score -->
				<div class="flex items-center justify-between pt-2 border-t border-gray-100">
					<div class="flex items-center gap-1.5 flex-wrap">
						{#if model.supports_vision}
							<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-200">
								<svg class="w-3 h-3 text-purple-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
								<span>Foto / OCR</span>
							</span>
						{/if}
						{#if model.supports_audio}
							<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] font-medium border border-amber-200">
								<svg class="w-3 h-3 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
								<span>Audio / VN</span>
							</span>
						{/if}
						{#if model.supports_web_search}
							<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded text-[10px] font-medium border border-sky-200">
								<svg class="w-3 h-3 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
								<span>Riset Web</span>
							</span>
						{/if}
						<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium">
							<svg class="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>
							<span>Penalaran</span>
						</span>
					</div>

					<div class="text-right">
						<span class="font-mono text-xs font-semibold text-[#0E6B2B]">{model.score}%</span>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Footer Summary -->
	<div class="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600">
		<div class="flex items-center gap-4 flex-wrap">
			<span class="inline-flex items-center gap-1.5">
				<svg class="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				<span>Asisten: <strong class="text-gray-900">{assistantModelName}</strong></span>
			</span>
			<span class="text-gray-300">|</span>
			<span class="inline-flex items-center gap-1.5">
				<svg class="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				<span>Admin Toko: <strong class="text-gray-900">{adminModelName}</strong></span>
			</span>
		</div>
		<span class="text-[11px] text-gray-500">Konfigurasi runtime otomatis aktif di server.</span>
	</div>

	{#if toastMessage}
		<div class="p-3 rounded-xl border text-xs flex items-center justify-between shadow-lg transition-all {toastType === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : toastType === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-red-50 text-red-900 border-red-200'}">
			<span>{toastMessage}</span>
			<button type="button" onclick={() => toastMessage = ''} class="font-bold ml-2 text-gray-500 hover:text-gray-900 cursor-pointer">✕</button>
		</div>
	{/if}
</div>
