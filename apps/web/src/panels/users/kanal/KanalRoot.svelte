<script lang="ts">
	import KanalHeader from './components/KanalHeader.svelte';
	import WhatsAppCard from './components/WhatsAppCard.svelte';
	import TelegramCard from './components/TelegramCard.svelte';
	import GoogleIntegrationCard from './components/GoogleIntegrationCard.svelte';
	import AllowedContactsCard from './components/AllowedContactsCard.svelte';
	import ConnectionLogsCard from './components/ConnectionLogsCard.svelte';

	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		userName = 'Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- Top Header with Status Banner -->
	<KanalHeader
		{businessName}
		{role}
		{dateText}
		connectionSummary="WhatsApp, Telegram, dan Google tersambung. Terakhir diperiksa 10.00 WIB."
	/>

	<!-- Two-column Grid for Messaging Channels -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<WhatsAppCard />
		<TelegramCard />
	</div>

	<!-- Full-width Google Integration Card -->
	<GoogleIntegrationCard />

	<!-- Full-width Whitelist & Access Rights Card -->
	<AllowedContactsCard />

	<!-- Full-width Connection Audit Logs Card -->
	<ConnectionLogsCard />
</div>
