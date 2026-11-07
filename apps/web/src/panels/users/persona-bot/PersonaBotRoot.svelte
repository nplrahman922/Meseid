<script lang="ts">
	import { onMount } from 'svelte';
	import PersonaBotHeader from './components/PersonaBotHeader.svelte';
	import PersonaConfigForm from './components/PersonaConfigForm.svelte';
	import PersonaPreviewCard from './components/PersonaPreviewCard.svelte';
	import AiModelSelectionCard from './components/AiModelSelectionCard.svelte';
	import { getOverviewDraft, saveOverviewDraft } from '../overview/overview-storage.service';
	import type { BotPersonaData } from './persona-bot.types';

	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Bisnis Saya',
		role = 'Owner',
		dateText = ''
	}: Props = $props();

	// Tab aktif: 'assistant' (Asisten Pemilik) atau 'admin' (Admin Toko)
	let activeTab = $state<'assistant' | 'admin'>('assistant');

	// State personalisasi untuk Asisten Pemilik
	let assistantData = $state<BotPersonaData>({
		botName: 'Asisten Bisnis',
		language: '',
		speakingStyles: ['Solutif', 'Sigap', 'Informatif'],
		customRules: ['Panggil Bos dengan sebutan Raja Sang Maharaja'],
		isCustomRulesEnabled: true
	});

	// State personalisasi untuk Admin Toko
	let adminData = $state<BotPersonaData>({
		botName: 'Admin Toko',
		language: '',
		speakingStyles: ['Ramah', 'Sopan', 'Informatif'],
		customRules: ['Layani pertanyaan stok, harga, dan jam buka dengan cepat'],
		isCustomRulesEnabled: true
	});

	let isSaving = $state(false);
	let assistantModelName = $state('Nemotron 3.5 Free');
	let adminModelName = $state('Nemotron 3.5 Free');

	// Reference ke komponen preview card untuk trigger simulasi otomatis
	let previewCardRef: PersonaPreviewCard | undefined = $state();

	async function loadSavedData() {
		try {
			// 1. Ambil detail konfigurasi personalisasi langsung dari database owner
			let hasLoadedDb = false;

			try {
				const persRes = await fetch('/api/owner/personalisasi', {
					headers: { Accept: 'application/json' },
					credentials: 'include'
				});

				if (persRes.ok) {
					const persJson = await persRes.json();
					const cfg = persJson.config || persJson.data;

					if (cfg) {
						if (cfg.assistant_bot_name) assistantData.botName = cfg.assistant_bot_name;
						if (cfg.assistant_language && cfg.assistant_language.toLowerCase() !== 'auto') {
							assistantData.language = cfg.assistant_language;
						}
						if (Array.isArray(cfg.assistant_speaking_styles) && cfg.assistant_speaking_styles.length > 0) {
							assistantData.speakingStyles = [...cfg.assistant_speaking_styles];
						}
						if (Array.isArray(cfg.assistant_custom_rules) && cfg.assistant_custom_rules.length > 0) {
							assistantData.customRules = [...cfg.assistant_custom_rules];
						}

						if (cfg.admin_bot_name) adminData.botName = cfg.admin_bot_name;
						if (cfg.admin_language && cfg.admin_language.toLowerCase() !== 'auto') {
							adminData.language = cfg.admin_language;
						}
						if (Array.isArray(cfg.admin_speaking_styles) && cfg.admin_speaking_styles.length > 0) {
							adminData.speakingStyles = [...cfg.admin_speaking_styles];
						}
						if (Array.isArray(cfg.admin_custom_rules) && cfg.admin_custom_rules.length > 0) {
							adminData.customRules = [...cfg.admin_custom_rules];
						}
						hasLoadedDb = true;
					}
				}
			} catch {
				// Abaikan jika gagal, lanjut fallback ke onboarding-detail
			}

			// Fallback ke endpoint onboarding-detail jika /personalisasi belum terisi lengkap
			if (!hasLoadedDb) {
				const detailRes = await fetch('/api/owner/onboarding-detail', {
					headers: { Accept: 'application/json' },
					credentials: 'include'
				});

				if (detailRes.ok) {
					const detailJson = await detailRes.json();
					const d = detailJson.data?.onboarding || detailJson.onboarding || detailJson.data;

					if (d) {
						if (d.assistantBotName) assistantData.botName = d.assistantBotName;
						if (d.assistantLanguage && d.assistantLanguage.toLowerCase() !== 'auto') {
							assistantData.language = d.assistantLanguage;
						}
						if (d.assistantSpeakingStyles && d.assistantSpeakingStyles.length > 0) {
							assistantData.speakingStyles = [...d.assistantSpeakingStyles];
						}
						if (d.assistantCustomRules && d.assistantCustomRules.length > 0) {
							assistantData.customRules = [...d.assistantCustomRules];
						}

						if (d.storeBotName) adminData.botName = d.storeBotName;
						if (d.storeLanguage && d.storeLanguage.toLowerCase() !== 'auto') {
							adminData.language = d.storeLanguage;
						}
						if (d.storeSpeakingStyles && d.storeSpeakingStyles.length > 0) {
							adminData.speakingStyles = [...d.storeSpeakingStyles];
						}
						if (d.storeCustomRules && d.storeCustomRules.length > 0) {
							adminData.customRules = [...d.storeCustomRules];
						}
						hasLoadedDb = true;
					}
				}
			}

			// 2. Fallback ke draft Overview (localStorage) jika database masih kosong
			const draft = getOverviewDraft();
			if (draft) {
				if (draft.assistantBotName && assistantData.botName === 'Asisten Bisnis') {
					assistantData.botName = draft.assistantBotName;
				}
				if (draft.assistantLanguage && !assistantData.language) {
					assistantData.language = draft.assistantLanguage;
				}
				if (draft.assistantSpeakingStyles && draft.assistantSpeakingStyles.length > 0 && assistantData.speakingStyles.length === 0) {
					assistantData.speakingStyles = [...draft.assistantSpeakingStyles];
				}
				if (draft.assistantCustomRules && draft.assistantCustomRules.length > 0 && assistantData.customRules.length === 0) {
					assistantData.customRules = [...draft.assistantCustomRules];
				}

				if (draft.storeBotName && adminData.botName === 'Admin Toko') {
					adminData.botName = draft.storeBotName;
				}
				if (draft.storeLanguage && !adminData.language) {
					adminData.language = draft.storeLanguage;
				}
				if (draft.storeSpeakingStyles && draft.storeSpeakingStyles.length > 0 && adminData.speakingStyles.length === 0) {
					adminData.speakingStyles = [...draft.storeSpeakingStyles];
				}
				if (draft.storeCustomRules && draft.storeCustomRules.length > 0 && adminData.customRules.length === 0) {
					adminData.customRules = [...draft.storeCustomRules];
				}
			}

			// 3. Ambil informasi model yang sedang aktif
			const modelsRes = await fetch('/api/owner/personalisasi/models', {
				headers: { Accept: 'application/json' },
				credentials: 'include'
			});

			if (modelsRes.ok) {
				const modelsJson = await modelsRes.json();
				const modelsList = modelsJson.models || modelsJson.data?.models || [];
				const activeAsstId = modelsJson.current_assistant_model_id || modelsJson.data?.current_assistant_model_id;
				const activeAdmId = modelsJson.current_admin_model_id || modelsJson.data?.current_admin_model_id;

				if (activeAsstId && modelsList.length > 0) {
					const found = modelsList.find((m: any) => m.preset_code === activeAsstId || m.model_id === activeAsstId);
					if (found) assistantModelName = found.display_name || found.name;
				}
				if (activeAdmId && modelsList.length > 0) {
					const found = modelsList.find((m: any) => m.preset_code === activeAdmId || m.model_id === activeAdmId);
					if (found) adminModelName = found.display_name || found.name;
				}
			}
		} catch {
			// Fallback ke default
		}
	}

	async function handleSavePersona() {
		try {
			isSaving = true;
			const payload = {
				assistant_bot_name: assistantData.botName,
				assistant_language: assistantData.language.trim() || 'auto',
				assistant_speaking_styles: assistantData.speakingStyles,
				assistant_custom_rules: assistantData.isCustomRulesEnabled ? assistantData.customRules : [],
				admin_bot_name: adminData.botName,
				admin_language: adminData.language.trim() || 'auto',
				speaking_styles: adminData.speakingStyles,
				custom_rules: adminData.isCustomRulesEnabled ? adminData.customRules : []
			};

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
				// Sinkronisasi dua arah ke draft Overview agar konsisten
				saveOverviewDraft({
					assistantBotName: assistantData.botName,
					assistantLanguage: assistantData.language,
					assistantSpeakingStyles: assistantData.speakingStyles,
					assistantCustomRules: assistantData.isCustomRulesEnabled ? assistantData.customRules : [],
					storeBotName: adminData.botName,
					storeLanguage: adminData.language,
					storeSpeakingStyles: adminData.speakingStyles,
					storeCustomRules: adminData.isCustomRulesEnabled ? adminData.customRules : []
				});

				// Otomatis picu simulasi pertanyaan template pertama untuk membuktikan personalisasi telah berubah
				const firstQuestion =
					activeTab === 'assistant'
						? 'Siapa kamu dan bagaimana kamu mengenali saya?'
						: 'Halo, toko ini buka jam berapa dan lokasinya di mana?';

				if (previewCardRef) {
					await previewCardRef.triggerSimulation(firstQuestion);
				}
			}
		} catch {
			// Error handling
		} finally {
			isSaving = false;
		}
	}

	async function runSimulationApi(message: string): Promise<{ reply_text: string; model_name: string } | null> {
		try {
			const res = await fetch('/api/owner/personalisasi/simulate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					persona: activeTab,
					message
				})
			});

			if (res.ok) {
				const json = await res.json();
				const sim = json.data?.simulation || json.simulation;
				if (sim) {
					return {
						reply_text: sim.reply_text,
						model_name: sim.model_name
					};
				}
			}
		} catch {
			// Error handling
		}
		return null;
	}

	onMount(() => {
		loadSavedData();
	});
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12 font-intel">
	<!-- 1. Header with Title & Progress Line (Clean Zero Emoji) -->
	<PersonaBotHeader
		{businessName}
		{role}
		{dateText}
	/>

	<!-- 2. Dual-Persona Main Tab Switcher -->
	<div class="bg-white rounded-2xl border border-[#E5E7EB] p-3 shadow-xs">
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={() => (activeTab = 'assistant')}
				class="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-intel font-medium transition-all cursor-pointer {activeTab === 'assistant' ? 'bg-[#0E6B2B] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}"
			>
				<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				<span>Asisten Pemilik</span>
				<span class="text-[10px] px-2 py-0.5 rounded-full {activeTab === 'assistant' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">
					{assistantData.botName}
				</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'admin')}
				class="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-intel font-medium transition-all cursor-pointer {activeTab === 'admin' ? 'bg-[#0E6B2B] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}"
			>
				<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				<span>Admin Toko</span>
				<span class="text-[10px] px-2 py-0.5 rounded-full {activeTab === 'admin' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">
					{adminData.botName}
				</span>
			</button>
		</div>
	</div>

	<!-- 3. Form Personalisasi & Pratinjau Percakapan Nyata (Dua Kolom) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{#if activeTab === 'assistant'}
			<PersonaConfigForm
				role="assistant"
				bind:botName={assistantData.botName}
				bind:language={assistantData.language}
				bind:speakingStyles={assistantData.speakingStyles}
				bind:customRules={assistantData.customRules}
				bind:isCustomRulesEnabled={assistantData.isCustomRulesEnabled}
				{isSaving}
				onSave={handleSavePersona}
			/>
			<PersonaPreviewCard
				bind:this={previewCardRef}
				role="assistant"
				botName={assistantData.botName}
				activeModelName={assistantModelName}
				onRunSimulation={runSimulationApi}
			/>
		{:else}
			<PersonaConfigForm
				role="admin"
				bind:botName={adminData.botName}
				bind:language={adminData.language}
				bind:speakingStyles={adminData.speakingStyles}
				bind:customRules={adminData.customRules}
				bind:isCustomRulesEnabled={adminData.isCustomRulesEnabled}
				{isSaving}
				onSave={handleSavePersona}
			/>
			<PersonaPreviewCard
				bind:this={previewCardRef}
				role="admin"
				botName={adminData.botName}
				activeModelName={adminModelName}
				onRunSimulation={runSimulationApi}
			/>
		{/if}
	</div>

	<!-- 4. Pilihan Mesin AI Bot Usaha (Zero Emoji + Clean SVGs) -->
	<AiModelSelectionCard />
</div>
