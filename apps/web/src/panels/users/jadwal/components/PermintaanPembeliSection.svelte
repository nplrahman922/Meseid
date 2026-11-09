<script lang="ts">
	import type { OrderInquiry } from '../jadwal.types';

	interface Props {
		inquiries?: OrderInquiry[];
		onAction?: (inquiryId: string, action: string) => void;
	}

	let { inquiries = [], onAction }: Props = $props();

	const defaultInquiries: OrderInquiry[] = [
		{
			id: 'inq-dedi',
			customerName: 'Bapak Dedi',
			orderSummary: '30 nasi kotak',
			slotDate: 'Sabtu, 17 Okt 2026',
			slotTime: '11.15–11.45 WIB',
			channel: 'whatsapp',
			receivedAt: '16 Okt, 08.10 WIB',
			hasCollision: true,
			collisionDetail: '17 Okt 11.15–11.45 WIB bertumpuk dengan Ibu Sari, 11.00–11.30 WIB',
			status: 'pending'
		},
		{
			id: 'inq-maya',
			customerName: 'Ibu Maya',
			orderSummary: '15 nasi kotak',
			slotDate: 'Senin, 19 Okt 2026',
			slotTime: '10.00–10.30 WIB',
			channel: 'telegram',
			receivedAt: '16 Okt, 09.25 WIB',
			hasCollision: false,
			status: 'pending'
		}
	];

	let displayList = $derived(inquiries.length > 0 ? inquiries : defaultInquiries);
	let pendingCollisions = $derived(displayList.filter((i) => i.hasCollision && i.status === 'pending'));

	function handleActionClick(id: string, action: string) {
		const target = displayList.find((i) => i.id === id);
		if (target) {
			if (action === 'setujui' || action === 'setujui_ubah') target.status = 'approved';
			if (action === 'tolak') target.status = 'rejected';
			if (action === 'usul_waktu') target.status = 'negotiating';
		}
		onAction?.(id, action);
	}
</script>

<div class="space-y-4">
	<!-- Section Title -->
	<h2 class="text-xl sm:text-2xl font-intel font-normal text-[#111111] tracking-wide">
		Permintaan dari pembeli
	</h2>

	<!-- Collision Alert Banner -->
	{#if pendingCollisions.length > 0}
		<div class="bg-[#FEFCE8] border border-[#FEF08A] rounded-xl px-4 py-3 text-xs text-[#854D0E] flex items-start gap-2 leading-relaxed">
			<span class="text-sm">⚠️</span>
			<span>
				<strong>{pendingCollisions.length} permintaan berpotensi bentrok:</strong> {pendingCollisions[0]?.collisionDetail || 'Tinjau waktu sebelum menyetujui.'}
			</span>
		</div>
	{/if}

	<!-- 2-Card Inquiries Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{#each displayList as item (item.id)}
			<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-4 flex flex-col justify-between">
				<div class="space-y-3">
					<!-- Title & Status Badge -->
					<div class="space-y-2">
						<h3 class="text-base font-semibold text-[#111111]">
							{item.customerName} - {item.orderSummary}
						</h3>

						<div>
							{#if item.hasCollision}
								<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
									<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
									Perlu tinjau · bentrok
								</span>
							{:else}
								<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
									Waktu tersedia
								</span>
							{/if}
						</div>
					</div>

					<!-- Timing & Channel Note -->
					<div class="space-y-1 font-mono text-xs">
						<div class="font-semibold text-[#111111]">
							{item.slotDate} · {item.slotTime}
						</div>
						<div class="text-[#6B7280]">
							<span class="capitalize">{item.channel}</span> · diterima {item.receivedAt}. Belum dicatat sebagai penjualan.
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="pt-2 border-t border-[#F3F4F6] flex flex-wrap items-center gap-2">
					{#if item.status === 'approved'}
						<span class="text-xs font-medium text-[#16A34A] py-1">✓ Pesanan telah disetujui</span>
					{:else if item.status === 'rejected'}
						<span class="text-xs font-medium text-red-600 py-1">✕ Pesanan ditolak</span>
					{:else if item.status === 'negotiating'}
						<span class="text-xs font-medium text-amber-600 py-1">⟳ Menunggu konfirmasi waktu pembeli</span>
					{:else if item.hasCollision}
						<button
							type="button"
							onclick={() => handleActionClick(item.id, 'usul_waktu')}
							class="px-3.5 py-2 text-xs font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer"
						>
							Usulkan waktu lain
						</button>
						<button
							type="button"
							onclick={() => handleActionClick(item.id, 'setujui_ubah')}
							class="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
						>
							Setujui setelah ubah
						</button>
						<button
							type="button"
							onclick={() => handleActionClick(item.id, 'tolak')}
							class="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
						>
							Tolak
						</button>
					{:else}
						<button
							type="button"
							onclick={() => handleActionClick(item.id, 'setujui')}
							class="px-4 py-2 text-xs font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer"
						>
							Setujui
						</button>
						<button
							type="button"
							onclick={() => handleActionClick(item.id, 'tolak')}
							class="px-4 py-2 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#111111] hover:bg-gray-50 transition-colors cursor-pointer"
						>
							Tolak
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
