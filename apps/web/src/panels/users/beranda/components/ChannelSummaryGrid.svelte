<script lang="ts">
	import type { ChannelMiniStatus } from '../beranda.types';

	interface Props {
		channels?: ChannelMiniStatus[];
	}

	let {
		channels = [
			{
				channel: 'whatsapp',
				name: 'WhatsApp',
				status: 'connected',
				detail: 'Nomor demo **** 0123'
			},
			{
				channel: 'telegram',
				name: 'Telegram',
				status: 'connected',
				detail: '@warungburina_demo_bot'
			},
			{
				channel: 'google',
				name: 'Google',
				status: 'connected',
				detail: 'Calendar & Drive · Gmail nonaktif'
			}
		]
	}: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
	{#each channels as item (item.channel)}
		<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3 shadow-xs">
			<!-- Title -->
			<div class="text-sm font-intel font-medium text-[#111111]">
				{item.name}
			</div>

			<!-- Status Badge -->
			<div>
				{#if item.status === 'connected'}
					<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#E8F9E6] text-[#0E6B2B] border border-[#C6F0C2]">
						<span class="w-1.5 h-1.5 rounded-full bg-[#1ED10E]"></span>
						Terhubung
					</span>
				{:else}
					<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-intel font-medium bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5]">
						<span class="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
						Terputus
					</span>
				{/if}
			</div>

			<!-- Channel Subtext / Detail -->
			<div class="text-xs font-intel text-[#6B7280]">
				{item.detail}
			</div>
		</div>
	{/each}
</div>
