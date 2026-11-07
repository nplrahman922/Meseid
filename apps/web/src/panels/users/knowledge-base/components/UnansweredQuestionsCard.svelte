<script lang="ts">
	import type { UnansweredQuestion } from '../knowledge-base.types';

	interface Props {
		questions?: UnansweredQuestion[];
		isLoading?: boolean;
		onCreateEntry?: (question: UnansweredQuestion) => void;
	}

	let {
		questions = [],
		isLoading = false,
		onCreateEntry
	}: Props = $props();

	function getChannelName(ch?: string): string {
		if (!ch) return 'WhatsApp';
		return ch.toLowerCase() === 'whatsapp' ? 'WhatsApp' : 'Telegram';
	}

	function getReasonBadge(reason?: string): { label: string; color: string } {
		switch (reason) {
			case 'leakage':
			case 'jailbreak':
				return { label: '🛡️ Ditolak Keamanan', color: 'bg-red-50 text-red-700 border-red-200' };
			case 'out_of_scope':
				return { label: '⚠️ Di Luar Toko', color: 'bg-amber-50 text-amber-700 border-amber-200' };
			case 'ambiguous':
				return { label: '💬 Perlu Klarifikasi', color: 'bg-blue-50 text-blue-700 border-blue-200' };
			case 'missing_kb':
			case 'fallback':
			default:
				return { label: '❓ Belum Ada di KB', color: 'bg-purple-50 text-purple-700 border-purple-200' };
		}
	}

	function formatDate(val?: string): string {
		if (!val) return 'Baru saja';
		try {
			const d = new Date(val);
			if (isNaN(d.getTime())) return val;
			return d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return val;
		}
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title -->
	<div class="flex items-center justify-between">
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Pertanyaan belum terjawab
		</h2>
		{#if isLoading}
			<span class="text-xs font-inter text-[#0E6B2B] animate-pulse">Memuat data...</span>
		{/if}
	</div>

	<!-- Callout Notice -->
	<div class="p-3.5 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-xs font-inter text-[#0E6B2B] leading-relaxed">
		Pertanyaan di bawah ini diajukan oleh pelanggan tetapi bot belum memiliki informasi atau menolak menjawabnya. Klik <strong>"Buat entri ↗"</strong> untuk menambahkan jawaban ke Knowledge Base.
	</div>

	<!-- Questions List -->
	<div class="space-y-4 pt-1">
		{#if questions.length === 0}
			<div class="py-8 text-center text-xs font-intel text-[#9CA3AF]">
				{#if isLoading}
					Sedang memeriksa pertanyaan belum terjawab...
				{:else}
					Semua pertanyaan pelanggan telah terjawab dan memiliki entri jawaban.
				{/if}
			</div>
		{:else}
			{#each questions as q (q.id)}
				{@const qText = q.question_text || q.questionText || ''}
				{@const times = q.times_asked ?? q.timesAsked ?? 1}
				{@const badge = getReasonBadge(q.rejection_reason || q.rejectionReason)}
				<div class="space-y-1.5 pb-3 border-b border-[#F3F4F6] last:border-b-0 last:pb-0">
					<!-- Title & Action -->
					<div class="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-intel">
						<span class="font-medium text-[#111111]">{qText}</span>
						<span class="text-[#9CA3AF]">/</span>
						<button
							type="button"
							onclick={() => onCreateEntry?.(q)}
							class="text-[#111111] hover:text-[#0E6B2B] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
						>
							Buat entri ↗
						</button>
					</div>

					<!-- Metadata & Reason Pill -->
					<div class="flex flex-wrap items-center gap-2 text-xs font-inter text-[#6B7280]">
						<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border {badge.color}">
							{badge.label}
						</span>
						<span>·</span>
						<span>{getChannelName(q.channel)}</span>
						<span>·</span>
						<span>{formatDate(q.created_at || q.timestamp)}</span>
						<span>·</span>
						<span class="font-medium text-[#111111]">{times}x ditanyakan</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footnote Disclaimer -->
	<p class="text-xs font-inter text-[#6B7280] pt-2 border-t border-[#F3F4F6]">
		Bot tidak menebak jawaban. Tambahkan informasi yang benar sebelum dipakai untuk membalas pelanggan.
	</p>
</div>
