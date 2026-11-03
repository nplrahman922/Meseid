<script lang="ts">
	import { onMount } from 'svelte';
	import PersonaBotHeader from './components/PersonaBotHeader.svelte';
	import BotGreetingForm from './components/BotGreetingForm.svelte';
	import ChatPreviewCard from './components/ChatPreviewCard.svelte';
	import AiModelSelectionCard from './components/AiModelSelectionCard.svelte';
	import type { BotPersonaConfig } from './persona-bot.types';

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

	let personaConfig = $state<BotPersonaConfig>({
		botName: 'Admin Toko',
		tone: 'ramah',
		greetingMessage: 'Halo! Selamat datang di toko kami. Ada yang bisa kami bantu?',
		additionalDirectives: 'Jawab pertanyaan pelanggan secara ramah, ringkas, dan jelas.'
	});

	async function loadSavedPersona() {
		try {
			const res = await fetch('/api/owner/personalisasi', {
				headers: { Accept: 'application/json' },
				credentials: 'include'
			});
			if (res.ok) {
				const json = await res.json();
				const config = json.data?.config;
				if (config) {
					if (config.admin_bot_name) {
						personaConfig.botName = config.admin_bot_name;
					}
					if (config.admin_persona_prompt) {
						personaConfig.additionalDirectives = config.admin_persona_prompt;
					}
				}
			}
		} catch {
			// Fallback ke default
		}
	}

	async function handleSavePersona() {
		try {
			await fetch('/api/owner/personalisasi', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					admin_bot_name: personaConfig.botName,
					admin_persona_prompt: `${personaConfig.additionalDirectives}. Pesan pembuka: "${personaConfig.greetingMessage}".`
				})
			});
		} catch {
			// Error handling ditangani di BotGreetingForm
		}
	}

	onMount(() => {
		loadSavedPersona();
	});
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- 1. Header with Title & Progress Line -->
	<PersonaBotHeader
		{businessName}
		{role}
		{dateText}
	/>

	<!-- 2. Two-Column Configuration & Live Preview -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<BotGreetingForm
			bind:personaConfig
			onSave={handleSavePersona}
		/>
		<ChatPreviewCard
			botName={personaConfig.botName}
			greetingMessage={personaConfig.greetingMessage}
		/>
	</div>

	<!-- 3. AI Model Selection Card with Tested Models & Plan Access -->
	<AiModelSelectionCard />
</div>
