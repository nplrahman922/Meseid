<script lang="ts">
	import JamOperasionalHeader from './components/JamOperasionalHeader.svelte';
	import WeeklyScheduleCard from './components/WeeklyScheduleCard.svelte';
	import ScheduleExceptionsCard from './components/ScheduleExceptionsCard.svelte';
	import OutOfHoursReplyCard from './components/OutOfHoursReplyCard.svelte';

	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
		timezone?: string;
		botName?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		userName = 'Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB',
		timezone = 'Asia/Jakarta',
		botName = 'Rini'
	}: Props = $props();

	function handleAddException() {
		alert('Fitur Tambah Pengecualian: Anda dapat memilih tanggal spesifik dan menentukan apakah warung libur atau menggunakan jam khusus.');
	}
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- 1. Header with Timezone and Operating Policy Banner -->
	<JamOperasionalHeader
		{businessName}
		{userName}
		{role}
		{dateText}
		{timezone}
	/>

	<!-- 2. Two-Column Layout -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
		<!-- Left Column: Weekly Schedule Card (7 Days) -->
		<WeeklyScheduleCard />

		<!-- Right Column: Exceptions & Out-of-hours Reply -->
		<div class="space-y-6">
			<ScheduleExceptionsCard onAddException={handleAddException} />
			<OutOfHoursReplyCard {botName} />
		</div>
	</div>
</div>
