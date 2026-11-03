<script lang="ts">
	import type { UnansweredQuestion } from '../knowledge-base.types';

	interface Props {
		questions?: UnansweredQuestion[];
		onCreateEntry?: (question: UnansweredQuestion) => void;
	}

	let {
		questions = [
			{
				id: '1',
				questionText: 'Ada pilihan tanpa gula?',
				channel: 'whatsapp',
				timestamp: '16 Okt 2026, 09.12 WIB',
				timesAsked: 3
			},
			{
				id: '2',
				questionText: 'Bisa kirim ke Jalan Melati?',
				channel: 'telegram',
				timestamp: '15 Okt 2026, 15.24 WIB',
				timesAsked: 1
			}
		],
		onCreateEntry
	}: Props = $props();

	function getChannelName(ch: string): string {
		return ch === 'whatsapp' ? 'WhatsApp' : 'Telegram';
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs">
	<!-- Card Title -->
	<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
		Pertanyaan belum terjawab
	</h2>

	<!-- Secondary Tab Callout Notice -->
	<div class="p-3.5 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-xs font-inter text-[#0E6B2B] leading-relaxed">
		Contoh panel tab sekunder · Tab utama tetap Entri usaha. Pertanyaan berikut belum memiliki jawaban yang disetujui Owner.
	</div>

	<!-- Questions List -->
	<div class="space-y-4 pt-1">
		{#if questions.length === 0}
			<div class="py-6 text-center text-xs font-intel text-[#9CA3AF]">
				Semua pertanyaan telah memiliki entri jawaban.
			</div>
		{:else}
			{#each questions as q (q.id)}
				<div class="space-y-1 pb-3 border-b border-[#F3F4F6] last:border-b-0 last:pb-0">
					<!-- Title & Action -->
					<div class="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-intel">
						<span class="font-medium text-[#111111]">{q.questionText}</span>
						<span class="text-[#9CA3AF]">/</span>
						<button
							type="button"
							onclick={() => onCreateEntry?.(q)}
							class="text-[#111111] hover:text-[#0E6B2B] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
						>
							Buat entri ↗
						</button>
					</div>

					<!-- Metadata -->
					<div class="text-xs font-inter text-[#6B7280]">
						{getChannelName(q.channel)} · {q.timestamp} · {q.timesAsked} kali ditanyakan
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footnote Disclaimer -->
	<p class="text-xs font-inter text-[#6B7280] pt-2 border-t border-[#F3F4F6]">
		Bot tidak menebak jawaban. Tambahkan informasi yang benar sebelum dipakai untuk membalas.
	</p>
</div>
