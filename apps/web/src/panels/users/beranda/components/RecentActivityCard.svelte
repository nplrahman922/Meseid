<script lang="ts">
	import type { RecentActivityItem } from '../beranda.types';

	interface Props {
		activities?: RecentActivityItem[];
	}

	let {
		activities = [
			{
				id: '1',
				title: 'Penjualan teh dicatat',
				amountOrAction: 'Rp 450.000',
				timestamp: '16 Okt · 09.45 WIB',
				channelOrSource: 'WhatsApp'
			},
			{
				id: '2',
				title: 'Belanja bahan terverifikasi',
				amountOrAction: 'Rp 125.000',
				timestamp: '16 Okt · 09.42 WIB',
				channelOrSource: 'Struk terbaca'
			},
			{
				id: '3',
				title: 'Laporan Oktober diperbarui',
				amountOrAction: 'Lihat file ↗',
				timestamp: '16 Okt · 09.30 WIB',
				channelOrSource: 'PDF versi 3',
				actionUrl: '#'
			},
			{
				id: '4',
				title: 'Pesanan katering dicatat',
				amountOrAction: 'Rp 1.250.000',
				timestamp: '15 Okt · 14.00 WIB',
				channelOrSource: 'Telegram'
			}
		]
	}: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs flex flex-col justify-between">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Aktivitas terbaru
	</h2>

	<!-- Activities List -->
	<div class="space-y-4">
		{#each activities as item (item.id)}
			<div class="space-y-0.5">
				<!-- Title & Value -->
				<div class="flex items-center justify-between text-xs sm:text-sm font-inter">
					<div class="flex items-center gap-2">
						<span class="font-medium text-[#111111]">{item.title}</span>
						<span class="text-[#9CA3AF]">/</span>
						{#if item.actionUrl}
							<a
								href={item.actionUrl}
								class="text-[#111111] font-medium hover:underline inline-flex items-center gap-0.5"
							>
								{item.amountOrAction}
							</a>
						{:else}
							<span class="font-medium text-[#111111]">{item.amountOrAction}</span>
						{/if}
					</div>
				</div>

				<!-- Meta: Date, Time, Channel/Source -->
				<div class="text-xs font-inter text-[#6B7280]">
					{item.timestamp} · {item.channelOrSource}
				</div>
			</div>
		{/each}
	</div>
</div>
