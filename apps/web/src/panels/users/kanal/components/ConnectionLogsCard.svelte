<script lang="ts">
	import type { ConnectionLogItem } from '../kanal.types';

	interface Props {
		logs?: ConnectionLogItem[];
	}

	let {
		logs = [
			{
				id: '1',
				timestamp: '10.00 WIB',
				title: 'Semua kanal diperiksa',
				description: 'WhatsApp tersambung · Telegram webhook sehat · Google token valid'
			},
			{
				id: '2',
				timestamp: '09.55 WIB',
				title: 'Kalender usaha disinkronkan',
				description: '2 acara mendatang · Tidak ada data inbox Gmail yang diakses.'
			}
		]
	}: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Catatan koneksi
	</h2>

	<!-- Logs List -->
	<div class="space-y-4">
		{#each logs as log (log.id)}
			<div class="space-y-1 text-xs sm:text-sm font-intel">
				<div class="font-bold text-[#111111]">
					<span>{log.timestamp}</span>
					<span class="mx-1">·</span>
					<span>{log.title}</span>
				</div>
				<div class="font-inter text-xs text-[#6B7280]">
					{log.description}
				</div>
			</div>
		{/each}
	</div>
</div>
