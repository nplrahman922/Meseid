<script lang="ts">
	interface Props {
		botName?: string;
		greetingMessage?: string;
	}

	let {
		botName = 'Rini',
		greetingMessage = 'Halo! Saya Rini, asisten Warung Bu Rina. Mau tanya menu, harga, atau jam buka?'
	}: Props = $props();
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5 shadow-xs flex flex-col justify-between">
	<div class="space-y-4">
		<!-- Card Title -->
		<h2 class="text-base sm:text-lg font-intel font-medium text-[#111111]">
			Pratinjau percakapan
		</h2>

		<!-- Static Info Banner -->
		<div class="p-3.5 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-xs font-inter text-[#0E6B2B] leading-relaxed">
			Contoh statis · WhatsApp · Mengikuti isian di samping / di atas.
		</div>

		<!-- Chat Bubbles Simulation -->
		<div class="space-y-3.5">
			<!-- Bubble 1: Bot Greeting -->
			<div class="bg-[#E8F9E6] border border-[#C6F0C2] rounded-2xl p-4 space-y-1.5 shadow-xs">
				<div class="text-[11px] font-intel font-semibold text-[#0E6B2B]">
					{botName || 'Bot'} · Asisten
				</div>
				<p class="text-xs font-inter text-[#111111] leading-relaxed whitespace-pre-wrap">
					{greetingMessage || 'Halo! Mau tanya sesuatu?'}
				</p>
				<div class="text-[10px] font-intel text-right text-[#6B7280]">
					09.40 WIB
				</div>
			</div>

			<!-- Bubble 2: Customer Query -->
			<div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-1.5 shadow-xs">
				<div class="text-[11px] font-intel font-medium text-[#6B7280]">
					Pembeli · Contoh
				</div>
				<p class="text-xs font-inter text-[#111111] leading-relaxed">
					Teh original berapa? Hari ini buka sampai jam berapa?
				</p>
				<div class="text-[10px] font-intel text-right text-[#6B7280]">
					09.41 WIB · Terkirim
				</div>
			</div>

			<!-- Bubble 3: Bot Answer using Knowledge Base -->
			<div class="bg-[#E8F9E6] border border-[#C6F0C2] rounded-2xl p-4 space-y-1.5 shadow-xs">
				<div class="text-[11px] font-intel font-semibold text-[#0E6B2B]">
					{botName || 'Bot'} · Asisten
				</div>
				<p class="text-xs font-inter text-[#111111] leading-relaxed">
					Teh original Rp 5.000 per gelas. Hari ini, Jumat, warung buka pukul 08.00–20.00 WIB. Silakan mampir, ya!
				</p>
				<div class="text-[10px] font-intel text-right text-[#6B7280]">
					09.42 WIB
				</div>
			</div>
		</div>
	</div>

	<!-- Footnote -->
	<p class="text-[11px] font-inter text-[#6B7280] leading-relaxed pt-3 border-t border-[#F3F4F6]">
		Sumber jawaban: Teh original &amp; Jam buka warung di Knowledge Base. Persona tidak mengubah harga atau jadwal.
	</p>
</div>
