<script lang="ts">
	interface Props {
		role: 'assistant' | 'admin';
		botName: string;
		activeModelName?: string;
		onRunSimulation: (message: string) => Promise<{ reply_text: string; model_name: string } | null>;
	}

	let {
		role,
		botName = 'Bot',
		activeModelName = 'AI Model',
		onRunSimulation
	}: Props = $props();

	let isLoading = $state(false);
	let customMessageInput = $state('');

	interface ChatItem {
		question: string;
		answer: string;
		modelName: string;
		timeText: string;
	}

	let currentChat = $state<ChatItem | null>(null);

	let defaultChat = $derived<ChatItem>({
		question:
			role === 'assistant'
				? 'Siapa kamu dan bagaimana kamu mengenali saya?'
				: 'Halo, toko ini buka jam berapa dan lokasinya di mana?',
		answer:
			role === 'assistant'
				? 'Halo Raja Sang Maharaja! Saya adalah asisten pribadi Anda. Saya siap membantu mencatat transaksi kas, memeriksa nota belanja, dan memantau operasional bisnis Anda hari ini.'
				: 'Halo! Selamat datang di toko kami. Kami buka setiap hari pukul 08.00–20.00 WIB. Ada yang bisa kami bantu hari ini?',
		modelName: activeModelName,
		timeText: 'Sekarang'
	});

	let displayChat = $derived(currentChat ?? defaultChat);

	// Reset custom chat saat berpindah peran bot
	$effect(() => {
		if (role) {
			currentChat = null;
		}
	});

	const assistantTemplates = [
		'Siapa kamu dan bagaimana kamu mengenali saya?',
		'Berapa perkiraan omset dan transaksi yang tercatat hari ini?',
		'Catat pengeluaran beli bensin operasional Rp 50.000.'
	];

	const adminTemplates = [
		'Halo, toko ini buka jam berapa dan lokasinya di mana?',
		'Apakah ada promo diskon atau katalog produk terbaru?',
		'Bisa minta nomor rekening untuk transfer pembayaran?'
	];

	let templates = $derived(role === 'assistant' ? assistantTemplates : adminTemplates);

	export async function triggerSimulation(messageText: string) {
		if (!messageText || !messageText.trim() || isLoading) return;
		isLoading = true;
		const trimmed = messageText.trim();

		try {
			const res = await onRunSimulation(trimmed);
			if (res && res.reply_text) {
				const now = new Date();
				const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')} WIB`;
				currentChat = {
					question: trimmed,
					answer: res.reply_text,
					modelName: res.model_name || activeModelName,
					timeText: timeStr
				};
			}
		} finally {
			isLoading = false;
		}
	}

	function handleCustomSubmit() {
		if (customMessageInput.trim()) {
			const msg = customMessageInput.trim();
			customMessageInput = '';
			triggerSimulation(msg);
		}
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs flex flex-col justify-between">
	<div class="space-y-4">
		<!-- Header with Title & Active Model Badge -->
		<div class="flex items-center justify-between pb-2 border-b border-[#F3F4F6]">
			<div>
				<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
					Pratinjau Percakapan Nyata
				</h2>
				<p class="text-[11px] font-inter text-[#6B7280]">
					Uji coba langsung respons kecerdasan buatan dengan persona aktif Anda.
				</p>
			</div>
			<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-[#0E6B2B] border border-emerald-200">
				<span class="w-1.5 h-1.5 rounded-full bg-[#0E6B2B] animate-pulse"></span>
				<span>{activeModelName}</span>
			</span>
		</div>

		<!-- Interactive Template Buttons -->
		<div class="space-y-2">
			<span class="block text-xs font-intel font-medium text-[#111111]">
				Pilih Pertanyaan Uji Coba:
			</span>
			<div class="flex flex-col gap-1.5">
				{#each templates as tpl, idx}
					<button
						type="button"
						disabled={isLoading}
						onclick={() => triggerSimulation(tpl)}
						class="w-full text-left p-2.5 rounded-xl border border-gray-200 hover:border-[#0E6B2B] hover:bg-emerald-50/30 transition-all text-xs font-intel text-gray-800 flex items-center justify-between group cursor-pointer disabled:opacity-50"
					>
						<span class="line-clamp-1">"{tpl}"</span>
						<span class="text-[10px] font-medium text-gray-400 group-hover:text-[#0E6B2B] shrink-0 ml-2">
							Kirim Uji Coba →
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Live Chat Bubble Simulation -->
		<div class="space-y-3 pt-2">
			<!-- User Question Bubble -->
			<div class="flex justify-end">
				<div class="max-w-[85%] bg-gray-100 rounded-2xl rounded-tr-xs p-3.5 space-y-1 shadow-2xs">
					<div class="text-[10px] font-intel text-gray-500">
						{role === 'assistant' ? 'Pemilik Usaha' : 'Pelanggan'}
					</div>
					<p class="text-xs font-inter text-gray-900 leading-relaxed whitespace-pre-wrap">
						{displayChat.question}
					</p>
				</div>
			</div>

			<!-- Bot Answer Bubble -->
			<div class="flex justify-start">
				<div class="max-w-[85%] bg-[#E8F9E6] border border-[#C6F0C2] rounded-2xl rounded-tl-xs p-3.5 space-y-1.5 shadow-2xs">
					<div class="flex items-center justify-between gap-2">
						<span class="text-[11px] font-intel font-semibold text-[#0E6B2B]">
							{botName} · {role === 'assistant' ? 'Asisten Pribadi' : 'Admin Toko'}
						</span>
						<span class="text-[10px] font-mono text-[#0E6B2B]/75">
							{displayChat.modelName}
						</span>
					</div>

					{#if isLoading}
						<div class="flex items-center gap-2 py-2 text-xs text-[#0E6B2B] font-intel">
							<svg class="animate-spin h-3.5 w-3.5 text-[#0E6B2B]" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
							<span>AI sedang menyusun jawaban berdasarkan persona...</span>
						</div>
					{:else}
						<p class="text-xs font-inter text-[#111111] leading-relaxed whitespace-pre-wrap">
							{displayChat.answer}
						</p>
					{/if}

					<div class="text-[10px] font-intel text-right text-gray-400 pt-0.5">
						{displayChat.timeText}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Custom Question Input -->
	<div class="pt-3 border-t border-[#F3F4F6]">
		<div class="flex items-center gap-2">
			<input
				type="text"
				bind:value={customMessageInput}
				disabled={isLoading}
				placeholder="Ketik pertanyaan uji coba kustom Anda..."
				onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomSubmit(); } }}
				class="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-intel text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0E6B2B]"
			/>
			<button
				type="button"
				disabled={isLoading || !customMessageInput.trim()}
				onclick={handleCustomSubmit}
				class="px-3.5 py-2 bg-[#0E6B2B] hover:bg-[#0c5924] text-white rounded-xl text-xs font-intel font-medium transition-colors cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
			>
				<span>Kirim</span>
				<svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
			</button>
		</div>
	</div>
</div>
