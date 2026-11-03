<script lang="ts">
	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
		connectionSummary?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB',
		connectionSummary = 'WhatsApp, Telegram, dan Google tersambung. Terakhir diperiksa 10.00 WIB.'
	}: Props = $props();
</script>

<header class="w-full space-y-4">
	<!-- Title & Subtitles -->
	<div class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-intel font-normal text-[#111111] tracking-wide">
			Kanal &amp; Integrasi
		</h1>
		<p class="text-sm font-inter text-[#4B5563]">
			Satu usaha, semua percakapan dan dokumen terhubung.
		</p>
		<p class="text-xs font-inter text-[#9CA3AF]">
			Data contoh · {businessName} · {role} · {dateText}
		</p>
	</div>

	<!-- Slider / Progress Line Decoration -->
	<div class="w-full flex items-center py-1">
		<div class="relative w-full flex items-center">
			<div class="w-2.5 h-2.5 rounded-full border-2 border-[#1ED10E] bg-white shrink-0"></div>
			<div class="flex-1 h-[1.5px] bg-[#1ED10E]/60"></div>
			<div class="w-2.5 h-2.5 rounded-full border-2 border-[#1ED10E] bg-white shrink-0"></div>
		</div>
	</div>

	<!-- Health Connection Status Banner -->
	<div
		class="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-[#0E6B2B] text-xs sm:text-sm font-intel font-medium transition-all"
	>
		<span class="text-base font-bold leading-none shrink-0">✓</span>
		<div class="flex-1 leading-relaxed">
			<span class="font-bold">Kesehatan koneksi baik</span>
			<span class="mx-1">·</span>
			<span class="font-normal">{connectionSummary}</span>
		</div>
	</div>
</header>
