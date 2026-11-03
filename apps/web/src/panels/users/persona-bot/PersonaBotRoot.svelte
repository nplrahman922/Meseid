<script lang="ts">
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
		businessName = 'Warung Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();

	let personaConfig = $state<BotPersonaConfig>({
		botName: 'Rini',
		tone: 'ramah',
		greetingMessage:
			'Halo! Saya Rini, asisten Warung Bu Rina. Mau tanya menu, harga, atau jam buka?',
		additionalDirectives:
			'Gunakan bahasa Indonesia sehari-hari. Jangan menebak stok atau ongkir; arahkan ke Bu Rina jika informasinya belum ada.'
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
		<BotGreetingForm bind:personaConfig />
		<ChatPreviewCard
			botName={personaConfig.botName}
			greetingMessage={personaConfig.greetingMessage}
		/>
	</div>

	<!-- 3. AI Model Selection Card with Corrected Labels -->
	<AiModelSelectionCard />
</div>
